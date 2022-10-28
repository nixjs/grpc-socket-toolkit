import React from "react";
import {
  WSClient,
  WSClientBuilder,
  WSEnums,
  WSTypes,
} from "@nixjs23n6/grpc-socket-core";
import { WebsocketContext } from "./useWebsocket";
import { WSReactTypes } from "./types";
import { Types } from "@nixjs23n6/types";
import { builderMap } from "./utils";

export interface SocketProviderProps {
  children: React.ReactNode;
  WSConfig: Types.Nullable<WSReactTypes.BuilderConfigs>;
  defaultActive?: string | number;
}

export const WebsocketProvider: React.FC<SocketProviderProps> = ({
  children,
  WSConfig,
  defaultActive,
}) => {
  const [builders, setBuilders] = React.useState<Types.Object<WSClientBuilder>>(
    {}
  );
  const [ws, setWS] = React.useState<Types.Nullable<WSClient>>(null);
  const [type, setType] = React.useState<Types.Undefined<string | number>>();

  const onExecuteBuild = ({
    key,
    resolve,
    rejects,
    path,
    protocols,
    protoConfigParameters,
    executeAnyFunc,
  }: {
    key: string | number;
    resolve: (state: WSEnums.States) => void;
    rejects: (reason?: string | WSEnums.States) => void;
    path?: string;
    protocols?: string | string[];
    protoConfigParameters?: WSTypes.ProtoConfigParameters;
    executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>;
  }) => {
    if (!builders[key]) {
      return rejects(WSEnums.States.ON_ERROR);
    }
    const promise: Promise<Types.Nullable<WSClient>> = new Promise(
      (_resolve) => {
        const b = builders[key].build({
          executeState(state) {
            return resolve(state);
          },
          path,
          protocols,
          protoConfigParameters,
          executeAnyFunc,
        });
        return _resolve(b);
      }
    );
    promise.then((r) => setWS(() => r));
  };

  React.useEffect(() => {
    if (WSConfig && Object.values(builders).length === 0) {
      const b = builderMap(WSConfig);
      setBuilders(b);
    }
  }, [WSConfig, builders]);

  React.useEffect(() => {
    if (defaultActive && builders[defaultActive]) {
      onExecuteBuild({
        key: defaultActive,
        resolve: () => null,
        rejects: () => null,
      });
    }
  }, [defaultActive, builders]);

  const onOpen = React.useCallback(
    (
      t: string,
      path?: string,
      protocols?: string | string[],
      protoConfigParameters?: WSTypes.ProtoConfigParameters,
      executeAnyFunc?: WSTypes.ExecuteAnyFunc<WSClient>
    ) => {
      return new Promise<WSEnums.States>((resolve, rejects) => {
        if (builders && builders[t] !== undefined) {
          if (type !== t) {
            setType(t);
            if (ws && ws.connected) {
              ws.close(
                WSEnums.ReasonCode.CLOSE,
                "Close current connection to create new connection."
              ).then((state) => {
                if (state === WSEnums.States.ON_CLOSE) {
                  onExecuteBuild({
                    key: t,
                    resolve,
                    rejects,
                    path,
                    protocols,
                    protoConfigParameters,
                    executeAnyFunc,
                  });
                }
              });
            } else {
              onExecuteBuild({
                key: t,
                resolve,
                rejects,
                path,
                protocols,
                protoConfigParameters,
                executeAnyFunc,
              });
            }
          } else {
            if (ws?.closed || !ws?.connected) {
              ws?.connect(
                path,
                protocols,
                protoConfigParameters,
                executeAnyFunc
              ).then(resolve);
            }
          }
        } else {
          return rejects(WSEnums.States.ON_ERROR);
        }
      });
    },
    [builders, type, ws]
  );

  const onReconnect = React.useCallback(() => {
    return new Promise<WSEnums.States>((resolve, reject) => {
      if (ws && !ws?.connected) {
        ws.reconnect().then(resolve).catch(reject);
      } else {
        return reject(WSEnums.States.ON_ERROR);
      }
    });
  }, [ws]);

  const onClose = React.useCallback(
    (code = WSEnums.ReasonCode.CLOSE, reason = "Close socket") => {
      return new Promise<WSEnums.States>((resolve, reject) => {
        try {
          ws?.close(code, reason);
          resolve(WSEnums.States.ON_CLOSE);
        } catch (error) {
          reject(WSEnums.States.ON_ERROR);
        }
      });
    },
    [ws]
  );

  const onDestroy = React.useCallback(() => {
    return new Promise<WSEnums.States>((resolve, reject) => {
      try {
        ws?.close(
          WSEnums.ReasonCode.DESTROY,
          "Close the connection before destroy"
        );
        resolve(WSEnums.States.ON_CLOSE);
        setWS(null);
      } catch (error) {
        reject(WSEnums.States.ON_ERROR);
      }
    });
  }, [ws]);

  return (
    <WebsocketContext.Provider
      value={{
        builders,
        ws,
        type,
        WSConfig,
        onOpen,
        onClose,
        onReconnect,
        onDestroy,
      }}
    >
      {children}
    </WebsocketContext.Provider>
  );
};
