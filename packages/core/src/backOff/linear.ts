import { BaseBackOff } from "./Base";

/**
 * LinearBackOff increases the backOff-time by a constant number with
 * every step. An optional maximum can be provided as an upper bound
 * to the returned backOff.
 *
 * Example: for initial=0, increment=2000, maximum=8000 the Linear-
 * BackOff will produce the series [0, 2000, 4000, 6000, 8000].
 */
export class LinearBackOff implements BaseBackOff {
  private readonly initial: number;
  private readonly increment: number;
  private readonly maximum?: number;
  private current: number;

  /**
   * Constructor
   * @param initial milliseconds
   * @param increment milliseconds
   * @param maximum milliseconds
   */
  constructor(initial: number, increment: number, maximum?: number) {
    this.initial = initial;
    this.increment = increment;
    this.maximum = maximum;
    this.current = this.initial;
  }

  next() {
    const backOff = this.current;
    const next = this.current + this.increment;
    if (this.maximum === undefined) this.current = next;
    else if (next <= this.maximum) this.current = next;
    return backOff;
  }

  reset() {
    this.current = this.initial;
  }
}
