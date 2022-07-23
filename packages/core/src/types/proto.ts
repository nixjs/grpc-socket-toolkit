import protobuf from "protobufjs";

export namespace ProtoTypes {
  export interface MsgType {
    [k: string]: any;
  }
  export interface Msg extends protobuf.Type {}
  export interface ProtoRoot extends protobuf.Namespace {
    Msg: ProtoTypes.Msg;
    MsgType: ProtoTypes.MsgType;
  }
  export interface MsgData extends protobuf.Message {
    type: number;
    id: string;
    data?: any;
    success?: boolean;
    errorCode?: number;
    errorMessage?: string;
  }
}
