import protobuf from "protobufjs";
import { Types } from "@nixjs23n6/types";
import { v4 as uuidv4 } from "uuid";
import { ProtoTypes } from "./types";
import { WSEnums } from "./enums";

export class Proto {
  public protoRoot!: ProtoTypes.ProtoRoot & {
    [k: string]: any;
  };
  public MsgType!: ProtoTypes.MsgType;
  public Msg!: ProtoTypes.Msg;
  public subscribers: any[] = [];
  public encoderDecoder: Record<number, protobuf.Type> = {};

  subscribe(callback: any) {
    this.subscribers.push(callback);
  }

  private _readProto(
    nestedRoot: string,
    resolve: (args: any) => void,
    reject: (reason: string) => void,
    root?: protobuf.Root,
    executeEncoderDecoderMap?: (self: Proto) => void
  ) {
    if (root && root.nested && root.nested[nestedRoot]) {
      this.protoRoot = root.nested[nestedRoot] as ProtoTypes.ProtoRoot & {
        [k: string]: ProtoTypes.Msg;
      };
      this.Msg = this.protoRoot.Msg;
      this.MsgType = this.protoRoot.MsgType;
      if (typeof executeEncoderDecoderMap === "function")
        executeEncoderDecoderMap(this);
      if (Object.keys(this.encoderDecoder).length === 0) {
        return reject(WSEnums.ProtoState.MESSAGE_ENCODERS_FAILED);
      }
      return resolve(WSEnums.ProtoState.READY);
    }
    return reject(WSEnums.ProtoState.NOT_YET);
  }

  init(
    nestedRoot = "ws",
    protoFile: string,
    protoJSONFallback?: Types.Object<any>,
    executeEncoderDecoderMap?: (self: Proto) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!protoFile) {
        if (protoJSONFallback && Object.keys(protoJSONFallback).length > 0) {
          const root = protobuf.Root.fromJSON(protoJSONFallback);
          this._readProto(
            nestedRoot,
            resolve,
            reject,
            root,
            executeEncoderDecoderMap
          );
        }
        return reject(WSEnums.ProtoState.PROTO_NOT_FOUND);
      }
      protobuf.load(protoFile, (err, root) => {
        if (err) {
          return reject(WSEnums.ProtoState.NOT_YET);
        }
        this._readProto(
          nestedRoot,
          resolve,
          reject,
          root,
          executeEncoderDecoderMap
        );
      });
    });
  }

  private _getCurrentUnixTimestamp(): number {
    return new Date().getTime();
  }

  public buildMsg(
    type: number,
    data?: any,
    msgId?: string
  ): Types.Nullable<ArrayBuffer> {
    let id = !msgId ? this.generateId() : msgId;
    id = id.toString();

    const encoder = this.encoderDecoder[type];
    if (!encoder) {
      return null;
    }

    return this.Msg.encode({
      id,
      type,
      data: encoder.encode(data).finish(),
    }).finish();
  }

  public generateId(): string {
    return `${this._getCurrentUnixTimestamp()}-${uuidv4()}`;
  }

  public createPingMessage(): Types.Nullable<ArrayBuffer> {
    return this.buildMsg(this.MsgType.PING);
  }

  public decodeMsg(buffer: ArrayBuffer): ProtoTypes.MsgData {
    const msg = this.Msg.decode(new Uint8Array(buffer)) as ProtoTypes.MsgData;
    const { data, type } = msg;
    msg.data = this.decodeData(data, type);
    return msg;
  }

  public decodeData(data: Uint8Array, type: number): any {
    if (!data || !type) return null;

    const newData = new Uint8Array(data);
    const decoder = this.encoderDecoder[type];

    if (!decoder) {
      return null;
    }

    return decoder.decode(newData);
  }
}

export const proto = new Proto();
