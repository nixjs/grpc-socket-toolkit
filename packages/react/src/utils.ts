import { Types } from "@nixjs23n6/types";
import { WSClientBuilder } from "@nixjs23n6/grpc-socket-core";
import { WSReactTypes } from "./types";

export const builderMap = (WSConfig: WSReactTypes.BuilderConfigs) => {
  let builders: Types.Object<WSClientBuilder> = {};
  const ports = Object.keys(WSConfig);
  for (let i = 0; i < ports.length; i++) {
    const p = ports[i];
    const {
      baseURL,
      path,
      protocols,
      isProtocolsRequired,
      backOff,
      executeAnyFunc,
      protoConfigParameters,
    } = WSConfig[p];

    const builder = new WSClientBuilder(baseURL, path);
    if (protocols) builder.addProtocols(protocols);
    if (backOff) builder.addBackOff(backOff);
    if (protoConfigParameters)
      builder.addProtoConfigParameters(protoConfigParameters);
    builder.addExecuteAnyFunc(executeAnyFunc);

    builders = Object.assign(builders, {
      [p]: builder.init(),
    });
  }
  return builders;
};
