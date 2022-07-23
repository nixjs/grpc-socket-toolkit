export interface BaseBackOff {
  /**
   * Provides the callee with the next number in the
   * series.
   * @return the next number
   */
  next(): number;

  /**
   *  Resets the series to its starting-value.
   */
  reset(): void;
}
