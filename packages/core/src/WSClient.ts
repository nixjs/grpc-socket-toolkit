import { Types, Interfaces } from "@nixjs23n6/types";
import debug from "debug";
import { proto, Proto } from "./proto";
import { WSConstant } from "./constants";
import { WSEnums } from "./enums";
import { ProtoTypes, WSTypes } from "./types";
import { BaseBackOff, ConstantBackOff } from "./backOff";
import { merge } from "./utils/merge";
import { showLogger, LogType } from "./utils/logger";

export class WSClient {
  public log: debug.Debugger;
  public websocket?: WebSocket;
  public URL: string;

  private _protoRoot!: ProtoTypes.ProtoRoot & {
    [k: string]: any;
  };
  private _MsgType!: ProtoTypes.MsgType;
  private _Msg!: ProtoTypes.Msg;

  private readonly _baseURL: string;
  private _protocols?: string | string[];
  private _path: string;
  private _backOff?: BaseBackOff;
  private _protoConfigParameters: WSTypes.ProtoConfigParameters;
  private _executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>;
  private _feedLiveIntervalId: Types.Nullable<NodeJS.Timer> = null;
  private _lastPing = 0;
  private _onceListeners: WSTypes.ListenerData[] = [];
  private _longListeners: WSTypes.ListenerData[] = [];
  private _stateListeners: WSTypes.ListenerData[] = [];

  private _closedByUser = false;
  private _initState = false;
  private _retry = false;
  private _maxRetries: number;
  private _maxRetriesCounter: number;

  constructor(
    baseURL: string,
    protocols?: string | string[],
    path?: string,
    backOff?: BaseBackOff,
    protoConfigParameters?: WSTypes.ProtoConfigParameters,
    executeAnyFunc?: (self: WSClient, protocols?: string | string[]) => void,
    logger?: Interfaces.Logger,
    maxRetries?: number
  ) {
    this._baseURL = baseURL;
    this._path = path || "";
    this.URL = this._baseURL + this._path;
    this._protocols = protocols;
    this._backOff = backOff || new ConstantBackOff(1000);
    this._maxRetriesCounter = 0;
    this._protoConfigParameters = protoConfigParameters || {
      nestedRoot: "",
      protoFile: "",
      executeEncoderDecoderMap: () => null,
    };
    this._maxRetries = maxRetries || 9;
    this.setInitialState();
    this._executeAnyFunc = executeAnyFunc;
    this.log = debug("");
    this._initLogger(logger);
  }

  public set connected(v: boolean) {
    this.connected = v;
  }

  public get connected() {
    return !!(this.websocket && this.websocket.readyState === WebSocket.OPEN);
  }

  public get closed() {
    return !!(this.websocket && this.websocket.readyState === WebSocket.CLOSED);
  }

  public set protocols(v: Types.Undefined<string | string[]>) {
    this._protocols = v;
  }

  public get protocols(): Types.Undefined<string | string[]> {
    return this._protocols;
  }

  public get protoRoot(): ProtoTypes.ProtoRoot & {
    [k: string]: any;
  } {
    return this._protoRoot;
  }

  public get protoMsg(): ProtoTypes.Msg {
    return this._Msg;
  }

  public get protoMsgType(): ProtoTypes.MsgType {
    return this._MsgType;
  }

  public setInitialState() {
    if (this._feedLiveIntervalId) clearInterval(this._feedLiveIntervalId);
    if (this._onceListeners) {
      const numOnceListener = this._onceListeners.length;

      for (let i = 0; i < numOnceListener; i += 1) {
        const listener = this._onceListeners[i];
        listener.reject({ status: WSEnums.Statuses.TIMEOUT });
      }
    }

    this._onceListeners = [];
    if (this._longListeners.length > 0) {
      this._longListeners = [];
    }

    this.websocket = undefined;
    this._feedLiveIntervalId = null;
    this._lastPing = 0;

    // state
    this._initState = false;

    if (this._stateListeners.length > 0) this._stateListeners = [];
  }

  public initProto(
    nestedRoot = "ws",
    protoFile: string,
    protoJSONFallback?: Types.Object<any>,
    executeEncoderDecoderMap?: (self: Proto) => void
  ): Promise<WSEnums.ProtoState> {
    return new Promise((resolve, reject) => {
      if (proto.protoRoot) {
        return resolve(WSEnums.ProtoState.READY);
      }
      this._protoConfigParameters = this._mergeProtoConfig({
        nestedRoot,
        protoFile,
        protoJSONFallback: protoJSONFallback || {},
        executeEncoderDecoderMap: executeEncoderDecoderMap as any,
      });
      proto
        .init(
          this._protoConfigParameters.nestedRoot,
          this._protoConfigParameters.protoFile,
          this._protoConfigParameters.protoJSONFallback,
          this._protoConfigParameters.executeEncoderDecoderMap
        )
        .then((res) => {
          return resolve(res as WSEnums.ProtoState);
        })
        .catch((error) => reject(error));
    });
  }

  public connect(
    path?: string,
    protocols?: string | string[],
    protoConfigParameters?: WSTypes.ProtoConfigParameters,
    executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        return resolve(WSEnums.States.ON_CONNECTED);
      }
      if (!this._retry) {
        // The first time, all parameters will set data
        // Do not set data when retry to connect socket.
        if (path) {
          this._path = path;
          this.URL = this._baseURL + path;
        }
        if (protocols) this._protocols = protocols;

        if (protoConfigParameters) {
          this._protoConfigParameters = this._mergeProtoConfig(
            protoConfigParameters
          );
        }
        if (executeAnyFunc) this._executeAnyFunc = executeAnyFunc;
      } else {
        this._retry = false;
      }

      if (typeof this._executeAnyFunc === "function")
        this._executeAnyFunc(this);

      if (proto.protoRoot) {
        this._storeProtoInfo();
        resolve(WSEnums.States.ON_PROTO_INIT);
        this._logger("Notify", "Init proto");
        return this._createInstance();
      }
      this.initProto(
        this._protoConfigParameters?.nestedRoot,
        this._protoConfigParameters?.protoFile,
        this._protoConfigParameters?.protoJSONFallback,
        this._protoConfigParameters.executeEncoderDecoderMap
      )
        .then((res) => {
          if (res === WSEnums.ProtoState.READY) {
            resolve(WSEnums.States.ON_PROTO_INIT);
            this._logger("Notify", "Init proto");
            this._storeProtoInfo();
            this._createInstance();
          } else {
            reject(WSEnums.States.ON_ERROR);
          }
        })
        .catch((error) => reject(error));
    });
  }

  public feedLive() {
    const now = Date.now();
    if (
      this.websocket &&
      this.connected &&
      now - this._lastPing > WSConstant.WS_CONFIG.PING_TIME_IN_MS
    ) {
      this._lastPing = now;
      const pingMsg = proto.createPingMessage();
      if (pingMsg) {
        this.websocket.send(pingMsg);
      } else {
        this._logger("Error", "Cannot create ping message");
      }
    }

    const numOnceListener = this._onceListeners.length;

    for (let i = 0; i < numOnceListener; i++) {
      const listener = this._onceListeners[i];
      if (
        now - listener.addedTime >
        WSConstant.WS_CONFIG.MESSAGE_TIMEOUT_IN_MS
      ) {
        listener.reject({ status: WSEnums.Statuses.TIMEOUT });
      }
    }
  }

  public send<T = any>(
    msgType: number,
    msgData: Types.Nullable<Types.Object<any>>
  ) {
    if (this._closedByUser) new Promise(() => null);
    const msgId = proto.generateId();
    const promise = this.addToListener<T>(
      msgType,
      msgId,
      msgData,
      WSEnums.ListenerTypes.ONCE,
      () => null
    );
    const data = proto.buildMsg(msgType, msgData, msgId);
    if (this.websocket && promise != null && data) this.websocket.send(data);
    return promise;
  }

  public subscribe<C = any, T = any>(
    msgType: Types.Nullable<number>,
    callback: WSTypes.ExecuteSubscribeFunc<C>
  ) {
    return this.addToListener<T>(
      msgType,
      null,
      null,
      WSEnums.ListenerTypes.LONG,
      callback
    );
  }

  public unsubscribe(subscriptionId: string) {
    const numLongListener = this._longListeners.length;
    const numStateListener = this._stateListeners.length;

    for (let i = 0; i < numLongListener; i += 1) {
      if (this._longListeners[i].subscriptionId === subscriptionId) {
        return this._longListeners.splice(i, 1);
      }
    }

    for (let i = 0; i < numStateListener; i += 1) {
      if (this._stateListeners[i].subscriptionId === subscriptionId) {
        return this._stateListeners.splice(i, 1);
      }
    }

    return -1;
  }

  public addToListener<T = any | string>(
    msgType: Types.Nullable<number>,
    msgId: Types.Nullable<string>,
    msgData: Types.Nullable<Types.Object<any>>,
    listenerType: WSEnums.ListenerTypes,
    callback: WSTypes.ExecuteSubscribeFunc
  ): any {
    const subscriptionId = proto.generateId();
    let listener = null;

    switch (listenerType) {
      case WSEnums.ListenerTypes.ONCE:
        listener = this._onceListeners;
        break;

      case WSEnums.ListenerTypes.LONG:
        listener = this._longListeners;
        break;

      case WSEnums.ListenerTypes.STATE:
        listener = this._stateListeners;
        break;
      default:
        break;
    }

    if (listener != null) {
      const promise: Promise<T> = new Promise((resolve, reject) => {
        listener.push({
          subscriptionId,
          msgType,
          msgId,
          msgData,
          addedTime: Date.now(),
          resolve,
          reject,
          callback,
        });
      });
      if (listenerType === WSEnums.ListenerTypes.ONCE) return promise;
    }
    return subscriptionId;
  }

  public broadcastState<K extends WSEnums.WebsocketEvents>(
    state: WSEnums.States,
    type?: Types.Undefined<K>
  ) {
    this._logger(
      "Notify",
      `Broadcasting state: ${state}. Metadata: ${JSON.stringify(type)}. URL: ${
        this.URL
      }`
    );
    for (const listener of this._stateListeners) {
      listener.callback(state, type);
    }
  }

  public subscribeState<C>(callback: WSTypes.ExecuteSubscribeFunc<C>) {
    return this.addToListener(
      null,
      null,
      null,
      WSEnums.ListenerTypes.STATE,
      callback
    );
  }

  public broadcastMessage(msg: ProtoTypes.MsgData) {
    let foundOnce = false;
    const numOnceListener = this._onceListeners.length;
    const numLongListener = this._longListeners.length;

    for (let i = 0; i < numOnceListener; i += 1) {
      const listener = this._onceListeners[i];
      if (listener?.msgId === msg.id) {
        foundOnce = true;
        if (msg.success) listener.resolve(msg.data);
        else listener.reject(msg);

        this._onceListeners.splice(i, 1);
        break;
      }
    }

    for (let i = 0; i < numLongListener; i += 1) {
      const listener = this._longListeners[i];
      if (listener?.msgType === msg.type) {
        foundOnce = true;
        listener.callback(msg?.data);
      }
    }

    if (!foundOnce && msg.type !== proto.MsgType.PONG) {
      this._logger("Error", `Unhandled msg: ${JSON.stringify(msg)}`);
    }
  }

  public close(reason: Types.Nullable<string>): Promise<number> {
    return new Promise((resolve) => {
      if (!this.websocket) return resolve(WSEnums.States.ON_CLOSE);
      this._closedByUser = true; // logout
      if (this.websocket.readyState === WebSocket.OPEN) {
        this._logger("Notify", `${reason || "Client is closing web socket"}.`);
        this._initState = true;
        this.websocket.close();
        this.subscribeState((state: WSEnums.States) => resolve(state));
      } else {
        this._logger(
          "Error",
          `Cannot close web socket. WS State: ${this.websocket.readyState}`
        );
        return resolve(WSEnums.States.ON_ERROR);
      }
    });
  }

  private _handleEvent<K extends WSEnums.WebsocketEvents>(
    protoState: WSEnums.States,
    type: K,
    ev: WSTypes.WebsocketEventMap[K]
  ) {
    switch (type) {
      case WSEnums.WebsocketEvents.close:
        if (this._initState) {
          this.setInitialState();
          this._logger(
            "Notify",
            "Clear all onceListeners, longListeners and broadcastStates"
          );
        }
        if (!this._closedByUser) {
          // failed to connect or connection lost, try to reconnect
          this._reconnect();
        }
        break;
      case WSEnums.WebsocketEvents.open:
        this._feedLiveIntervalId = setInterval(() => this.feedLive(), 1000);
        this._backOff?.reset(); // reset backOff
        break;
    }
    this._dispatchEvent<K>(protoState, type, ev); // forward to all listeners
  }

  private _dispatchEvent<K extends WSEnums.WebsocketEvents>(
    protoState: WSEnums.States,
    type: K,
    ev: WSTypes.WebsocketEventMap[K]
  ) {
    if (type === WSEnums.WebsocketEvents.message) {
      this.broadcastMessage(proto.decodeMsg((ev as any).data));
    } else {
      this.broadcastState(protoState, type);
    }
  }

  private _createInstance() {
    this.websocket = new WebSocket(this.URL, this._protocols);
    this.websocket.binaryType = "arraybuffer";
    this._logger("Success", "The Socket instance created");

    this.websocket.onopen = (event) => {
      this._handleEvent(
        WSEnums.States.ON_OPENED,
        WSEnums.WebsocketEvents.open,
        event
      );
    };
    this.websocket.onclose = (event) =>
      this._handleEvent(
        WSEnums.States.ON_CLOSE,
        WSEnums.WebsocketEvents.close,
        event
      );
    this.websocket.onerror = (event) =>
      this._handleEvent(
        WSEnums.States.ON_ERROR,
        WSEnums.WebsocketEvents.error,
        event
      );
    this.websocket.onmessage = (event) =>
      this._handleEvent(
        WSEnums.States.ON_CONNECTED,
        WSEnums.WebsocketEvents.message,
        event
      );
  }

  private _mergeProtoConfig = ({
    nestedRoot,
    protoFile,
    protoJSONFallback,
    executeEncoderDecoderMap,
  }: WSTypes.ProtoConfigParameters) =>
    merge(this._protoConfigParameters, {
      nestedRoot,
      protoFile,
      protoJSONFallback,
      executeEncoderDecoderMap,
    }) as WSTypes.ProtoConfigParameters;

  private _reconnect() {
    if (!this._backOff) return;
    const backOff = this._backOff.next();
    if (this._maxRetriesCounter >= this._maxRetries) {
      this._retry = false;
      this._backOff.reset();
      return;
    }
    this._retry = true;
    setTimeout(() => {
      // retry connection after waiting out the backOff-interval
      this._logger("Notify", "Auto-reconnecting to server");
      this._maxRetriesCounter += 1;
      this.connect();
    }, backOff);
  }

  private _initLogger(logger?: Interfaces.Logger) {
    this.log.enabled = (logger && logger.debug) || false;
    this.log.namespace = (logger && logger.namespace) || "[Socket]";
    this.log.color = (logger && logger.color) || "#D3DEDC";
  }

  private _logger(type: LogType, message: string) {
    return showLogger(this.log, type, message);
  }

  private _storeProtoInfo() {
    this._protoRoot = proto.protoRoot;
    this._Msg = proto.Msg;
    this._MsgType = proto.MsgType;
  }
}
