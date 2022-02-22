import { Clock } from '@master-chief/alpaca';
import { RawClock } from '@master-chief/alpaca/@types/entities';

export const clockData: (isMarketOpen: boolean) => Clock = (isMarketOpen: boolean) => ({
  timestamp: new Date(),
  is_open: isMarketOpen,
  next_open: new Date(),
  next_close: new Date(),
  raw: () => rawClockData(isMarketOpen),
});

const rawClockData: (isMarketOpen: boolean) => RawClock = (isMarketOpen: boolean) => ({
  timestamp: new Date().toISOString(),
  is_open: isMarketOpen,
  next_open: new Date().toISOString(),
  next_close: new Date().toISOString(),
});
