import * as React from "react";
import { WSReactTypes } from "./types";

export const WebsocketContext =
  React.createContext<WSReactTypes.WSContextState>(
    {} as WSReactTypes.WSContextState
  );

export function useWebsocket(): WSReactTypes.WSContextState {
  return React.useContext(WebsocketContext);
}
