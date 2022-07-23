import React from "react";
import { Types } from "@nixjs23n6/types";
import {
  WSClient,
  WSClientBuilder,
  WSEnums,
} from "@nixjs23n6/grpc-socket-core";
import { WebsocketContext } from "./useWebsocket";
import { WSReactTypes } from "./types";
import { builderMap } from "./utils";

export interface SocketProviderProps {
  children: React.ReactNode;
  WSConfig: WSReactTypes.BuilderConfigs;
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

  React.useEffect(() => {
    if (Object.values(builders).length === 0 && defaultActive) {
      const b = builderMap(WSConfig);
      setBuilders(b);
      setWS(b[defaultActive].build({}));
    }
  }, []);

  const onOpen = React.useCallback(
    (t: string) => {
      return new Promise<WSEnums.States>((resolve, reject) => {
        if (WSConfig[t] !== undefined) {
          if (type !== t) {
            setType(t);
            if (ws)
              ws.close(
                "Close current connection to create new connection."
              ).then((state: WSEnums.States) => {
                if (state === WSEnums.States.ON_CLOSE) {
                  const b = builders[t].build({
                    executeState(state: WSEnums.States) {
                      resolve(state);
                      setWS(() => b);
                    },
                  });
                }
              });
          } else {
            if (ws?.closed || !ws?.connected) {
              ws?.connect().then(resolve);
            }
          }
        } else {
          return reject(WSEnums.States.ON_ERROR);
        }
      });
    },
    [builders, type, ws]
  );

  const onReconnect = React.useCallback(() => {
    return new Promise<WSEnums.States>((resolve, reject) => {
      if (ws && !ws?.connected) {
        ws.connect().then(resolve);
      } else {
        return reject(WSEnums.States.ON_ERROR);
      }
    });
  }, [ws]);

  const onClose = React.useCallback(
    (reason = "Close socket") => {
      return new Promise<WSEnums.States>((resolve, reject) => {
        if (ws) {
          if (!ws?.connected) throw new Error("No connection socket.");
          ws?.close(reason).then(resolve);
        } else {
          return reject(WSEnums.States.ON_ERROR);
        }
      });
    },
    [ws]
  );

  const onDestroy = React.useCallback(() => {
    return new Promise<WSEnums.States>((resolve, reject) => {
      if (ws && ws.connected) {
        ws.close("Close the connection before destroy").then(
          (state: WSEnums.States) => {
            state === WSEnums.States.ON_CLOSE && setWS(null);
            resolve(state);
          }
        );
        setWS(null);
      } else {
        return reject(WSEnums.States.ON_ERROR);
      }
    });
  }, [ws]);

  return (
    <WebsocketContext.Provider
      value={{
        builders,
        ws,
        type,
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
