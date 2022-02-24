import { getTime, isFuture, isPast, isSameDay, isSameHour, isSameMinute } from 'date-fns';
import { ScheduledMarketFunction } from '../interfaces/scheduled-market-function';
import Logger from '../logger';
import AlpacaService from '../services/alpaca-utils.service';
import { formatCurrentDateInEst, getCurrentDate, getCurrentZonedDate, parseTimeFromEst } from '../services';
import { generateAlpacaCredentials } from '../utils';

export class MarketStrategy {
  private _config: ScheduledMarketFunction[];
  private _logger: Logger;

  constructor(config: ScheduledMarketFunction[]) {
    this._logger = new Logger();
    this._config = config;
  }

  private _mapDateToConfigFunction(): ScheduledMarketFunction {
    for (let f of this._config) {
      /* 
        Break up time range with split(); trim each string and 
        convert into the respective date today. 
      */
      const timeRange = f.time.split('-').map((t) => parseTimeFromEst(t.trim()));
      const curr = getCurrentDate();
      /* 
        If the provided time was a single time, we want to return a handler if the
        current time matches that one exactly. Otherwise, if the provided time was
        a range, we want to return a handler if the current time falls within that range
      */

      if (
        (timeRange.length === 1 && isSameMinute(curr, timeRange[0])) ||
        (timeRange.length === 2 && isPast(timeRange[0]) && isFuture(timeRange[1]))
      ) {
        return f;
      }
    }
  }

  public async execute() {

    /* Get the scheduled handler to execute (if it exists) and current formatted date. */
    const f = this._mapDateToConfigFunction();
    const d = formatCurrentDateInEst('hh:mm');

    /* Configure an Alpaca Service and check if the market is open. */
    const config = generateAlpacaCredentials();
    const alpaca = new AlpacaService(config);
    const marketIsOpen = await alpaca.isMarketOpenNow();

    /* Execute the handler function 1) if it exists and 2) the market is open. */
    /* if (!marketIsOpen) {
      this._logger.info(
        `MARKET STRATEGY`,
        `The market is closed today at ${d}! Bypassing execution.`
      );
    } else */ if (f) {
      this._logger.info(`MARKET STRATEGY`, `Scheduled strategy found at ${d}. Running code now.`);
      try { await f.code(); }
      catch (err) { this._logger.error(`Problem executing scheduled handler. See above output for more info.`)}
    } else {
      this._logger.info(
        `MARKET STRATEGY`,
        `Market is open, but there exists no scheduled strategy detected to run at ${d}. Exiting function gracefully.`,
      );
    }

  }
}
