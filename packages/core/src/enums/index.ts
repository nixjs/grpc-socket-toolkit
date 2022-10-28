export namespace WSEnums {
    export enum ListenerTypes {
        ONCE = 1,
        LONG = 2,
        STATE = 3
    }

    export enum States {
        ON_PROTO_INIT,
        ON_OPENED,
        ON_ERROR,
        ON_CLOSE,
        ON_CONNECTED
    }

    export enum Statuses {
        SUCCESS = 1,
        ERROR,
        TIMEOUT
    }
    export enum WebsocketEvents {
        open = 'open', // Connection is opened or re-opened
        close = 'close', // Connection is closed
        error = 'error', // An error occurred
        message = 'message' // A message was received
    }
    export enum ProtoState {
        PROTO_NOT_FOUND = 'PROTO_NOT_FOUND',
        NOT_YET = 'NOT_YET',
        READY = 'READY',
        MESSAGE_ENCODERS_FAILED = 'MESSAGE_ENCODERS_FAILED' // Message encoders are not defined
    }
    export enum ReasonCode {
        CLOSE = 4000,
        DESTROY,
        CLOSE_TO_RECONNECT,
        CLOSE_LOGOUT
    }
}
