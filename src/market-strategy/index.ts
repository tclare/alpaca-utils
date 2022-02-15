import { isFuture, isPast, isSameMinute } from 'date-fns';
import { ScheduledMarketFunction } from '../interfaces/market-strategy.interface';
import { getCurrentDate, getDateTodayFromTime } from '../services/date-service';

export default class MarketStrategy {
  private _config: ScheduledMarketFunction[];
  constructor(config: ScheduledMarketFunction[]) {
    this._config = config;
  }

  private _mapDateToConfigFunction(): ScheduledMarketFunction {

    for (let f of this._config) {
      /* 
        Break up time range with split(); trim each string and 
        convert into the respective date today. 
      */
      const timeRange = f.time.split('-').map(t => getDateTodayFromTime(t.trim()));
      /* 
        If the provided time was a single time, we want to return a handler if the
        current time matches that one exactly. Otherwise, if the provided time was
        a range, we want to return a handler if the current time falls within that range
      */
      if (
        timeRange.length === 1 && isSameMinute(getCurrentDate(), timeRange[0]) ||
        timeRange.length === 2 && isPast(timeRange[0]) && isFuture(timeRange[1])
      ) {
        return f;
      }

    }
  }

  public execute() {
    this._mapDateToConfigFunction()?.code();
  }
}
