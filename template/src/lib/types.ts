/**
 * done: the run completed. pending: still queued or running when waiting stopped, collect it by running again.
 * failed: looot reported failed, blocked or stopped. skipped_cap: not run because the next call would pass the cap.
 */
export type CallStatus = "done" | "pending" | "failed" | "skipped_cap";

/** Result for one input and one job. */
export interface ItemResult {
  item: string;
  jobId: string;
  status: CallStatus;
  costMicros: number;
  key: string;
  runId: string;
  /** The provider's answer, as looot returned it. Parsers read this. */
  raw?: unknown;
  error?: string;
}
