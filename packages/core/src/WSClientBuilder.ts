import { Types, Interfaces } from "@nixjs23n6/types";
import { WSTypes } from "./types";
import { WSClient } from "./WSClient";
import { BaseBackOff } from "./backOff";
import { WSEnums } from "./enums";

export interface BuilderParameters {
  path?: string;
  protocols?: string | string[];
  protoConfigParameters?: WSTypes.ProtoConfigParameters;
  executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>;
  executeState?: (state: WSEnums.States) => void;
}

export class WSClientBuilder {
  private readonly _baseURL: string;
  private _ws: WSClient | null = null;
  private _protocols?: string | string[];
  private _backOff?: BaseBackOff;
  private _path?: string;
  private _protoConfigParameters?: WSTypes.ProtoConfigParameters;
  private _executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>;
  private _logger: Interfaces.Logger = {};

  constructor(baseURL: string, path?: string) {
    this._baseURL = baseURL;
    this._path = path;
  }

  public addProtocols(p: string | string[]) {
    this._protocols = p;
    return this;
  }

  public addBackOff(b: BaseBackOff) {
    this._backOff = b;
    return this;
  }

  public addProtoConfigParameters(p: WSTypes.ProtoConfigParameters) {
    this._protoConfigParameters = p;
    return this;
  }

  public addExecuteAnyFunc(exe?: WSTypes.ExecuteAnyFunc<WSClient>) {
    if (typeof exe === "function") this._executeAnyFunc = exe;
    return this;
  }

  public addLogger(logger?: Interfaces.Logger) {
    this._logger.debug = (logger && logger.debug) || false;
    this._logger.namespace = (logger && logger.namespace) || "[Socket]";
    this._logger.color = (logger && logger.color) || "#D3DEDC";
  }

  /**
   * Create WSClient instance
   */
  public init() {
    if (this._ws !== null) return this;
    this._ws = new WSClient(
      this._baseURL,
      this._protocols,
      this._path,
      this._backOff,
      this._protoConfigParameters,
      this._executeAnyFunc,
      this._logger
    );
    return this;
  }

  /**
   * Connect socket and allow override the parameters WSClient
   * @param path
   * @param protocols
   * @param protoConfigParameters
   * @param executeAnyFunc
   */
  public build({
    protocols,
    protoConfigParameters,
    path,
    executeAnyFunc,
    executeState,
  }: BuilderParameters): Types.Nullable<WSClient> {
    if (!this._ws) return null;
    this._ws
      .connect(path, protocols, protoConfigParameters, executeAnyFunc)
      .then((state) => executeState && executeState(state))
      .catch((state) => executeState && executeState(state));
    return this._ws;
  }
}
