import { Types } from "@nixjs23n6/types";
import { Proto } from "../proto";
import { WSEnums } from "../enums";

export namespace WSTypes {
  export type ExecuteEncoderDecoderMap<T> = (self: T) => void;
  export type ExecuteAnyFunc<T> = (self: T) => void;

  export type ExecuteSubscribeFunc<T = any> = (...args: T[]) => void;

  export type ExecuteBroadcastFunc = (
    state: WSEnums.ListenerTypes,
    type?: WSEnums.WebsocketEvents,
    ...args: any[]
  ) => void;

  export interface ListenerData {
    subscriptionId?: string;
    msgType: Types.Nullable<number>;
    msgId: Types.Nullable<string>;
    msgData: Types.Nullable<Types.Object<any>>;
    addedTime: number;
    resolve: (args: any) => void;
    reject: (args: any) => void;
    callback: ExecuteSubscribeFunc;
  }

  export interface WebsocketEventMap {
    close: CloseEvent;
    error: Event;
    message: MessageEvent<any>;
    open: Event;
  }

  export interface ProtoConfigParameters {
    protoFile: string;
    nestedRoot: string;
    executeEncoderDecoderMap: (self: Proto) => void;
    protoJSONFallback?: Types.Object<any>;
  }
}
