import { Types } from "@nixjs23n6/types";
import {
  WSTypes,
  WSClient,
  WSClientBuilder,
  BaseBackOff,
  WSEnums,
} from "@nixjs23n6/grpc-socket-core";

export namespace WSReactTypes {
  export interface WSParameters {
    baseURL: string;
    isProtocolsRequired: boolean;
    protocols?: string | string[];
    path: string;
    backOff?: BaseBackOff;
    protoConfigParameters?: WSTypes.ProtoConfigParameters;
    executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>;
  }
  export type BuilderConfigs = Record<string, WSParameters>;
  export type BuilderInstances = Record<string, WSClientBuilder>;
  export interface WSContextState {
    type?: string | number;
    builders: BuilderInstances;
    ws: Types.Nullable<WSClient>;
    onOpen: (type: string) => Promise<any>;
    onReconnect: () => Promise<WSEnums.States>;
    onClose: (reason?: string) => Promise<WSEnums.States>;
    onDestroy: () => Promise<WSEnums.States>;
  }
}
