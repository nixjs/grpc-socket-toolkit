import { BaseBackOff } from "./base";

/**
 * ConstantBackOff always returns the same value.
 * The ConstantBackOff will make the websocket wait a constant time between each connection retry.
 */
export class ConstantBackOff implements BaseBackOff {
  private readonly backOff: number;

  /**
   * Constructor
   * @param backOff milliseconds
   */
  constructor(backOff: number) {
    this.backOff = backOff;
  }

  next(): number {
    return this.backOff;
  }

  reset = () => {
    // no-op
  };
}
