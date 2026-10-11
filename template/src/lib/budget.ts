/**
 * Spend cap for one run, in micro-dollars. Reserve the list price before a call, then settle with the real cost.
 * Calls running in parallel reserve before they start, so the cap holds under concurrency.
 */
export class Budget {
  spent = 0;
  reserved = 0;
  constructor(readonly capMicros: number) {}

  /** Reserves the list price of a call. false when the call could pass the cap. A free call always fits. */
  reserve(micros: number): boolean {
    if (micros > 0 && this.spent + this.reserved + micros > this.capMicros) return false;
    this.reserved += micros;
    return true;
  }

  /** Replaces the reservation with the real cost. */
  settle(reservedMicros: number, actualMicros: number): void {
    this.reserved -= reservedMicros;
    this.spent += actualMicros;
  }

  /** Dollars left under the cap, in micros. */
  get room(): number {
    return this.capMicros - this.spent - this.reserved;
  }
}
