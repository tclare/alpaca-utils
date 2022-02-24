import _ from 'lodash';
import Bluebird, { Promise as P } from 'bluebird';
import { AlpacaClient, Asset, Order, PlaceOrder, Quote, Snapshot } from '@master-chief/alpaca';
import { AlpacaCredentialsConfig, WhichQuotes } from '../interfaces';
import { ORDER_LIMIT_MAX } from '../constants/';
import { getMOCDatetimeToday, getMOODatetimeToday, getStartOfToday } from './date-service';
import Logger from '../logger';

export class AlpacaService {
  private _verbose: boolean;
  private _logger: Logger;
  private _alpacaClient: AlpacaClient;

  constructor(config: AlpacaCredentialsConfig) {
    this._verbose = config.verbose ?? false;
    this._logger = new Logger();
    this._alpacaClient = new AlpacaClient({
      credentials: {
        key: config.apiKeyId,
        secret: config.secretKey,
      },
    });
  }

  get alpacaClient(): AlpacaClient {
    return this._alpacaClient;
  }

  /**
   * Get the user's account associated with
   * the associated API key and secret key.
   * @return: a promise of the Alpaca user's account
   */
  getAccount() {
    return this._alpacaClient
      .getAccount()
      .then((account) => {
        if (this._verbose)
          this._logger.info(`GET ACCOUNT`, `Successfully retrieved account information for this user.`);
        return account;
      })
      .catch((err) => {
        this._logger.error(`GET ACCOUNT`, `Problem retrieving account with provided credentials.`, err);
      });
  }

  getSomeAssets(symbols: string[]) {
    const symbolSet = new Set(symbols);
    return this._alpacaClient
      .getAssets()
      .then((allAssets) => {
        if (this._verbose)
          this._logger.info(`GET SOME ASSETS`, `Successfully retrieved information regarding all Alpaca assets.`);
        const assetsToReturn = allAssets.filter((a: Asset) => symbolSet.has(a.symbol));
        if (assetsToReturn.length != symbols.length)
          this._logger.warn(
            `GET SOME ASSETS`,
            `However, some assets specified are not tracked by Alpaca:`,
            `${JSON.stringify(symbols.filter((s) => !assetsToReturn.find((a) => s === a.symbol)))}`,
          );
        return assetsToReturn;
      })
      .catch((err) => {
        this._logger.error(`GET SOME ASSETS`, `Error getting some assets:`, `${JSON.stringify(symbols)}:`, err);
        return err;
      });
  }

  getSnapshots(symbols: string[]): Promise<Snapshot[]> {
    return this._alpacaClient
      .getSnapshots({ symbols })
      .then((snapshots) => {
        if (this._verbose)
          this._logger.info(
            `GET SNAPSHOTS`,
            `Successfully retrieved snapshots for the following symbols:`,
            `${JSON.stringify(symbols)}`,
          );

        if (Object.keys(snapshots).find((sym) => !snapshots[sym]))
          this._logger.warn(
            `GET SNAPSHOTS`,
            `However, Alpaca could not return snapshots for unrecognized symbols:`,
            `${JSON.stringify(symbols.filter((sym) => !snapshots[sym]))}`,
          );

        return Object.keys(snapshots)
          .filter((sym) => snapshots[sym])
          .map((sym) => snapshots[sym]);
      })
      .catch((err) => {
        this._logger.error(
          `GET SNAPSHOTS`,
          `Error getting snapshots given following symbols:`,
          `${JSON.stringify(symbols)}:`,
          err,
        );
        return err;
      });
  }

  getQuotesToday(symbols: string[], whichQuotes: WhichQuotes) {
    return P.map(symbols, (symbol) => this._getQuotesTodaySingleSymbol(symbol, whichQuotes));
  }

  _getQuotesTodaySingleSymbol(symbol: string, whichQuotes: WhichQuotes): Promise<Quote[]> {
    const getDailyQuotes = (symbol: string, pageToken: string) => {
      return this._alpacaClient.getQuotes({
        symbol,
        start: getMOODatetimeToday(),
        end: getMOCDatetimeToday(),
        limit: 10000,
        ...(pageToken && { page_token: pageToken }),
      });
    };

    return new Promise<Quote[]>(async (resolve) => {
      let quotes: Quote[] = [];
      let pageToken: string = '';

      /* If we only request the first quote for a symbol, we only need to */
      if (whichQuotes === 'first') {
        return resolve([(await getDailyQuotes(symbol, pageToken)).quotes[0]]);
      }
      while (pageToken != null) {
        const quotePage = await getDailyQuotes(symbol, pageToken);
        pageToken = quotePage.next_page_token;
        if (whichQuotes === 'all' || pageToken === null) {
          quotes.push(...quotePage.quotes);
        }
      }
      resolve(quotes);
    })

      .then((quotes) => {
        if (this._verbose)
          this._logger.info(
            `GET QUOTES TODAY (${whichQuotes.toUpperCase()})`,
            `Successfully retrieved ${whichQuotes} quote information for the symbol ${symbol}.`,
          );
        return quotes;
      })

      .catch((err) => {
        this._logger.error(
          `GET QUOTES TODAY (${whichQuotes.toUpperCase()})`,
          `Problem retrieving ${whichQuotes} quote information for the symbol ${symbol}:`,
          err,
        );
        return err;
      });
  }

  getPositions() {
    return this._alpacaClient
      .getPositions()
      .then((positions) => {
        if (this._verbose)
          this._logger.info(`GET POSITIONS`, `Successfully retrieved ${positions.length} open positions`);
        return positions;
      })
      .catch((err) => {
        this._logger.error(`GET POSITIONS`, `Error retrieving open positions:`, err);
      });
  }

  /**
   * isMarketOpenNow: an abstraction from Alpaca's Clock API
   * returning whether or not the market is open right now.
   * @returns boolean
   */
  isMarketOpenNow(): Promise<boolean> {
    return this._alpacaClient
      .getClock()
      .then((clock) => {
        if (this._verbose) this._logger.info(`IS MARKET OPEN`, `Successfully retrieved market clock`);
        return clock.is_open;
      })
      .catch((err) => {
        this._logger.error(`IS MARKET OPEN`, `Error retrieving market calendar:`, err);
        return false;
      });
  }

  closeAllPositions(): Promise<{ success: boolean }> {
    return this._alpacaClient
      .closePositions()
      .then((orders) => {
        if (this._verbose) this._logger.info(
          `CLOSE ALL POSITIONS`, 
          `${orders.length} previously open positions now closed.`
        );
        return { success: true };
      })
      .catch((err) => {
        this._logger.warn(`CLOSE ALL POSITIONS`, `Problem closing out all positions:`, err);
        return { success: false };
      })
  }

  closePositions(symbols: string[]) {
    return P.map(symbols, (symbol: string) => this.closePosition(symbol)).then((results) => {
      if (this._verbose) {
        this._logger.info(
          `CLOSE POSITIONS`,
          `Finished closing ${symbols.length} positions. To recap: `,
          `Positions successfully closed include: `,
          `${JSON.stringify(results.filter((r) => r.success).map((r) => r.order.symbol))} `,
          `And positions that weren't closed successfully include: `,
          `${JSON.stringify(results.filter((r) => !r.success).map((r) => r.order.symbol))}`,
        );
      }
    });
  }

  closePosition(symbol: string): Promise<{ success: boolean; order: Order }> {
    return this._alpacaClient
      .closePosition({ symbol })
      .then((order) => {
        if (this._verbose) this._logger.info(`CLOSE POSITION`, `Position in ${symbol} successfully closed.`);
        return { order, success: true };
      })
      .catch((err) => {
        this._logger.warn(`CLOSE POSITION`, `Problem closing out position in ${symbol}: `, err);
        return { order: null, success: false };
      });
  }

  cancelAllOrders(): Promise<{ success: boolean }> {
    return this._alpacaClient
      .cancelOrders()
      .then((orderCancellations) => {
        if (this._verbose)
          this._logger.info(`CANCEL ALL ORDERS`, `Successfully cancelled ${orderCancellations.length} open orders.`);
        return { success: true };
      })
      .catch((err) => {
        this._logger.error(`CANCEL ALL ORDERS`, `Error cancelling all orders:`, err);
        return { success: false };
      });
  }

  /**
   *
   * @param orderConfigs - an array of order config
   * objects, one per order.
   * @returns an array of promises that resolves to
   * the result of the order placings.
   */
  placeMultipleOrders(orderConfigs: PlaceOrder[]): Bluebird<void> {
    return P.map(orderConfigs, this.placeOrder).then((orderResults) => {
      if (this._verbose) {
        this._logger.info(
          `PLACE MULTIPLE ORDERS`,
          `Finished placing `,
          `${orderConfigs.length} `,
          `orders. To recap: `,
          `Successful orders included: `,
          `${JSON.stringify(orderResults.filter((r) => r.success).map((r) => r.symbol))} `,
          `and failing orders included: `,
          `${JSON.stringify(orderResults.filter((r) => !r.success).map((r) => r.symbol))} `,
        );
      }
    });
  }

  /**
   *
   * @param orderConfig - a PlaceOrder configuration
   * object outlining the details of the order
   * @returns a promise to place the order. If
   * an order fails, the error is logged, and the promise
   * resolves with false.
   */
  placeOrder(orderConfig: PlaceOrder): Promise<{ symbol: string; success: boolean }> {
    return this._alpacaClient
      .placeOrder(orderConfig)
      .then(() => {
        if (this._verbose)
          this._logger.info(`PLACE ORDER`, `Successfully placed order with config: `, `${JSON.stringify(orderConfig)}`);
        return { symbol: orderConfig.symbol, success: true };
      })
      .catch((err) => {
        this._logger.warn(
          `PLACE ORDER`,
          `Problem placing order with config: `,
          `${JSON.stringify(orderConfig, null, 4)}`,
          err,
        );
        return { symbol: orderConfig.symbol, success: false };
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
    return this._alpacaClient
      .getOrders({
        status: includeAllOrders ? 'all' : 'open',
        limit: ORDER_LIMIT_MAX,
        after: getStartOfToday(),
      })
      .then((orders) => {
        if (this._verbose)
          this._logger.info(`GET ORDERS PLACED TODAY`, `Successfully retrieved ${orders.length} open orders.`);
      })
      .catch((err) => {
        this._logger.error(`GET ORDERS PLACED TODAY`, `Problem retrieving orders placed today: `, err);
        return err;
      });
  }
}
