export interface ScheduledMarketFunction {
  time: string;
  code: () => void;
}
