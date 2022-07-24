import { BaseBackOff } from "./Base";

/**
 * ExponentialBackOff doubles the backOff with every step until a maximum
 * is reached. This is modelled after the binary exponential-backOff algo-
 * rithm used in computer-networking.
 *
 * The calculation-specification is:
 *          backOff = k * 2^s with s in [1, expMax].
 *
 * Example: for initial=100, expMax=7 the ExponentialBackOff will pro-
 * duce the backOff-series [100, 200, 400, 800, 1600, 3200, 6400].
 */
export class ExponentialBackOff implements BaseBackOff {
  private readonly initial: number;
  private readonly expMax: number;
  private expCurrent: number;
  private current: number;

  /**
   * Constructor
   * @param initial milliseconds
   * @param expMax number
   */
  constructor(initial: number, expMax: number) {
    this.initial = initial;
    this.expMax = expMax;
    this.expCurrent = 1;
    this.current = this.initial;
  }

  next(): number {
    const backOff = this.current;
    if (this.expMax > this.expCurrent++) this.current = this.current * 2;
    return backOff;
  }

  reset() {
    this.expCurrent = 1;
    this.current = this.initial;
  }
}
