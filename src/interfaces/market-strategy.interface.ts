export interface MarketStrategyConfigFunction {
  startTime: string;
  endTime: string;
  code: () => {};
}

export type MarketStrategyConfig = MarketStrategyConfigFunction[];
