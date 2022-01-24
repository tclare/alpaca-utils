import _ from 'lodash';
import Bluebird, { Promise as P } from 'bluebird';
import { AlpacaClient, Bar_v1, GetBars_v1, PlaceOrder, Snapshot } from '@master-chief/alpaca';

import { AlpacaCredentialsConfig, QuoteConfig, QuotePrice } from '../interfaces';
import { MAX_SYMBOLS_PER_BAR_REQUEST, MINUTES_IN_TRADING_DAY, ORDER_LIMIT_MAX } from '../constants/';
import {
  getMOCDatetimeNDaysAgo,
  getMOCOrCurrentTime,
  getMOODatetimeNDaysAgo,
  getMOODatetimeToday,
  getStartOfToday,
} from './date-service';

export default class AlpacaService {
  private _alpacaClient: AlpacaClient;

  constructor(config: AlpacaCredentialsConfig) {
    this._alpacaClient = new AlpacaClient({
      credentials: {
        key: config.apiKeyId,
        secret: config.secretKey,
      },
    });
  }

  get alpacaClient() {
    return this._alpacaClient;
  }

  /**
   * Get the user's account associated with
   * the associated API key and secret key.
   * @return: a promise of the Alpaca user's account
   */
  getAccount() {
    return this._alpacaClient.getAccount();
  }

  /**
   * Get the bars for a given array of stock symbols
   * according to Alpaca's v1 API. Breaks up the symbols
   * array into chunks of 200 (maximum allowed per API call)
   * and returns a Promise.all of all the stock symbol groups.
   * @param: symbols - a list of all stock symbols to get bars for
   * @param: config - an optional configuration to apply to all bar charts reeturned
   * @return: a promise of a map of stock symbols to each's corresponding stock data, at a 1min interval
   */
  getBars(symbols: string[], config?: Partial<GetBars_v1>) {
    const chunkedSymbols = _.chunk(symbols, MAX_SYMBOLS_PER_BAR_REQUEST);
    return P.map(chunkedSymbols, (symbolGroup: string[]) =>
      this.alpacaClient.getBars_v1({
        symbols: symbolGroup,
        timeframe: config?.timeframe ?? '1Min',
        ...config,
      }),
    ).then((barGroups): Bluebird<{ [symbol: string]: Bar_v1[] }> => Object.assign({}, ...barGroups));
  }

  /**
   * Gets all trading day bars that have been generated so far.
   * A wrapper for getBars() above.
   * @param: symbols - a list of all stock symbols to get bars for
   * @return: a promise of all the bar data requested
   */
  getBarsMostRecentTradingDay(symbols: string[]) {
    return this.getMinuteBarsNTradingDaysAgo(symbols, 1);
  }

  getMinuteBarsNTradingDaysAgo(symbols: string[], n: number) {
    return this.getBars(symbols, {
      start: getMOODatetimeNDaysAgo(n),
      end: getMOCDatetimeNDaysAgo(n),
      limit: MINUTES_IN_TRADING_DAY,
    });
  }

  getTickerSnapshots(symbols: string[]) {
    return this.alpacaClient.getSnapshots({ symbols });
  }

  /**
   *
   * @param quoteConfigs - a collection of configurations
   * to get price quotes from. The main reason this is used
   * instead of a symbols array is to specify the side of
   * the quote price to see. On a long position, we want to
   * see the current bid price; for a short position, we
   * want to see the current ask price.
   * @returns a promise of all quote prices specified by the
   * quote config parameters.
   */
  getLatestQuotePrices(quoteConfigs: QuoteConfig[]): Promise<QuotePrice[]> {
    const symbols = quoteConfigs.map((c) => c.symbol);
    return this.getTickerSnapshots(symbols).then((snapshots: { [symbol: string]: Snapshot }) =>
      Object.keys(snapshots).map((symbol, i) => {
        const side = quoteConfigs[i].side;
        return {
          symbol,
          side,
          price: snapshots[symbol].latestQuote[side === 'long' ? 'bp' : 'ap'],
        };
      }),
    );
  }

  /**
   *
   * @returns a promise of all positions currently
   * open within the specificed Alpaca account
   * */
  getPositions() {
    return this._alpacaClient.getPositions();
  }

  closePositions(symbols: string[]) {
    return P.map(symbols, (symbol: string) => this.closePosition(symbol));
  }

  closePosition(symbol: string) {
    return this._alpacaClient.closePosition({ symbol });
  }

  /**
   *
   * @param orderConfigs - an array of order config
   * objects, one per order.
   * @returns an array of promises that resolves to
   * the result of the order placings.
   */
  placeMultipleOrders(orderConfigs: PlaceOrder[]) {
    return P.map(orderConfigs, this.placeOrder);
  }

  /**
   *
   * @param orderConfig - a PlaceOrder configuration
   * object outlining the details of the order
   * @returns a promise to place the order. If
   * an order fails, the error is logged, and the promise
   * resolves with false.
   */
  placeOrder(orderConfig: PlaceOrder) {
    return this.alpacaClient.placeOrder(orderConfig).catch((err) => {
      console.log(`[ERROR] Placing Order: `, err, `\nThe order has config ${JSON.stringify(orderConfig)}`);
      return false;
    });
  }

  /**
   * This method returns a list of orders placed since market
   * open on the most recent day.
   * @param includeAllOrders: true if the returned orders should
   * include both orders that are still open and those that are closed.
   * @return: a promise of the orders, filtered as specified.
   */
  getOrdersPlacedToday(includeAllOrders: boolean = false) {
    return this.alpacaClient.getOrders({
      status: includeAllOrders ? 'all' : 'open',
      limit: ORDER_LIMIT_MAX,
      after: getStartOfToday(),
    });
  }
}
