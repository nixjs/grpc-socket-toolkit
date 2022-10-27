export namespace WSConstant {
    export const WS_CONFIG = {
        PING_TIME_IN_MS: 5000,
        MESSAGE_TIMEOUT_IN_MS: 6000,
        FEED_LIVE_IN_MS: 200
    }
    export const WS_STATE = {
        0: 'ON_PROTO_INIT',
        1: 'ON_OPENED',
        2: 'ON_ERROR',
        3: 'ON_CLOSE',
        4: 'ON_CONNECTED'
    }
}
