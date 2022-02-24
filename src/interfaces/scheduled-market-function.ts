import { AlpacaService } from '..';

export interface ScheduledMarketFunction {
  time: string;
  code: (alpaca: AlpacaService) => void;
}
