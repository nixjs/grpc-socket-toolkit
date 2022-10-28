import { Types, Interfaces } from "@nixjs23n6/types";
import { BaseBackOff } from "@nixjs23n6/backoff-typescript";
import {
  WSTypes,
  WSClient,
  WSClientBuilder,
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
    logger?: Interfaces.Logger;
    maxRetries?: number;
  }
  export type BuilderConfigs = Record<string, WSParameters>;
  export type BuilderInstances = Record<string, WSClientBuilder>;
  export interface WSContextState {
    type?: string | number;
    builders: BuilderInstances;
    ws: Types.Nullable<WSClient>;
    WSConfig: Types.Nullable<WSReactTypes.BuilderConfigs>;
    onOpen: (
      type: string,
      path?: string,
      protocols?: string | string[],
      protoConfigParameters?: WSTypes.ProtoConfigParameters,
      executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>
    ) => Promise<any>;
    onReconnect: () => Promise<WSEnums.States>;
    onClose: (code?: number, reason?: string) => Promise<WSEnums.States>;
    onDestroy: () => Promise<WSEnums.States>;
  }
}
