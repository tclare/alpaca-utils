import _ from 'lodash';
import Bluebird, { Promise as P } from 'bluebird';
import { Account, AlpacaClient, AlpacaStream, Asset, Order, PlaceOrder, Position, Quote, ReplaceOrder, Snapshot } from '@master-chief/alpaca';
import { AlpacaCredentialsConfig, WhichQuotes } from '../interfaces';
import { ORDER_LIMIT_MAX } from '../constants/';
import { getMOCDatetimeToday, getMOODatetimeToday, getStartOfToday } from './date-service';
import Logger from '../logger';
import { OrderType, TradeUpdate } from '@master-chief/alpaca/@types/entities';

export class AlpacaService {
  private _verbose: boolean;
  private _logger: Logger;
  private _alpacaClient: AlpacaClient;
  private _alpacaStream: AlpacaStream;

  constructor(config: AlpacaCredentialsConfig) {
    this._verbose = config.verbose ?? false;
    this._logger = new Logger();

    const credentials = {
      key: config.apiKeyId,
      secret: config.secretKey,
    }

    this._alpacaClient = new AlpacaClient({ credentials });

    if (config.type === 'stream') {
      this._alpacaStream = new AlpacaStream({
        credentials,
        type: 'account',
        source: 'sip'
      });
    }
  }

  get alpacaClient(): AlpacaClient {
    return this._alpacaClient;
  }

  get alpacaStream(): AlpacaStream {
    return this._alpacaStream;
  }

  /**
   * Get the user's account associated with
   * the associated API key and secret key.
   * @return: a promise of the Alpaca user's account
   */
  getAccount(): Promise<Account> {
    return this._alpacaClient
      .getAccount()
      .then((account) => {
        if (this._verbose)
          this._logger.info(`GET ACCOUNT`, `Successfully retrieved account information for this user.`);
        return account;
      })
      .catch((err) => {
        this._logger.error(
          `GET ACCOUNT`, 
          `Problem retrieving account with provided credentials.`, 
          JSON.stringify(err)
        );
        return err;
      });
  }

  getSomeAssets(symbols: string[]): Promise<Asset[]> {
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
        this._logger.error(
          `GET SOME ASSETS`, 
          `Error getting some assets:`, 
          `${JSON.stringify(symbols)}:`, 
          `${JSON.stringify(err)}`
        );
        return err;
      });
  }

  getSnapshots(symbols: string[]): Promise<{ [symbol: string]: Snapshot }> {
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

        return snapshots;
      })
      .catch((err) => {
        this._logger.error(
          `GET SNAPSHOTS`,
          `Error getting snapshots given following symbols:`,
          `${JSON.stringify(symbols)}:`,
          JSON.stringify(err),
        );
        return err;
      });
  }

  async getQuotesToday(symbols: string[], whichQuotes: WhichQuotes): Promise<{ [symbol: string]: Quote[] }> {
    return new Promise(async (resolve) => {
      const quoteData = await P.map<any, { [symbol: string]: Quote[] }>(
        symbols,
        (symbol) =>
          new Promise(async (resolve) => {
            const quotes = await this._getQuotesTodaySingleSymbol(symbol, whichQuotes);
            return resolve({ [symbol]: quotes });
          }),
      );
      return resolve(Object.assign({}, ...quoteData));
    });
  }

  _getQuotesTodaySingleSymbol(symbol: string, whichQuotes: WhichQuotes): Promise<Quote[]> {
    const getDailyQuotes = (symbol: string, pageToken: string) => {
      return this._alpacaClient.getQuotes({
        symbol,
        start: getMOODatetimeToday(),
        end: getMOCDatetimeToday(),
        limit: whichQuotes === 'all' ? 10000 : 1,
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
          JSON.stringify(err),
        );
        return err;
      });
  }

  getPositions(): Promise<Position[]> {
    return this._alpacaClient
      .getPositions()
      .then((positions) => {
        if (this._verbose)
          this._logger.info(
            `GET POSITIONS`, 
            `Successfully retrieved ${positions.length} open positions`
          );
        return positions;
      })
      .catch((err) => {
        this._logger.error(
          `GET POSITIONS`, 
          `Error retrieving open positions:`, 
          JSON.stringify(err)
        );
        return err;
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
        this._logger.error(
          `IS MARKET OPEN`, 
          `Error retrieving market calendar:`, 
          JSON.stringify(err)
        );
        return false;
      });
  }

  closeAllPositions(config: { cancelOrders: boolean }): Promise<{ success: boolean }> {
    return this._alpacaClient
      .closePositions({ cancel_orders: config.cancelOrders || false })
      .then((orders) => {
        if (this._verbose)
          this._logger.info(`CLOSE ALL POSITIONS`, `${orders.length} previously open positions now closed.`);
        return { success: true };
      })
      .catch((err) => {
        this._logger.warn(
          `CLOSE ALL POSITIONS`, 
          `Problem closing out all positions:`, 
          JSON.stringify(err)
        );
        return { success: false };
      });
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
        this._logger.warn(
          `CLOSE POSITION`, 
          `Problem closing out position in ${symbol}: `, 
          JSON.stringify(err)
        );
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
        this._logger.error(
          `CANCEL ALL ORDERS`, 
          `Error cancelling all orders:`, 
          JSON.stringify(err)
        );
        return { success: false };
      });
  }

  getOrdersTodayOfType(orderType: OrderType): Promise<Order[]> {
    return this._alpacaClient
      .getOrders()
      .then()
      
  }

  /**
   *
   * @param orderConfigs - an array of order config
   * objects, one per order.
   * @returns an array of promises that resolves to
   * the result of the order placings.
   */
  placeMultipleOrders(orderConfigs: PlaceOrder[]): Bluebird<void> {
    return P.map(
      orderConfigs, 
      (orderConfig) => this.placeOrder(orderConfig)
    ).then((orderResults) => {
      const successfulSymbols = orderResults.filter((r) => r.success).map((r) => r.symbol);
      const failingSymbols = orderResults.filter((r) => !r.success).map((r) => r.symbol);
      if (this._verbose) {
        this._logger.info(
          `PLACE MULTIPLE ORDERS`,
          `Finished placing `,
          `${orderConfigs.length} `,
          `orders. To recap: `,
          `Successful orders included: `,
          `${JSON.stringify(successfulSymbols)} `,
          `and failing orders included: `,
          `${JSON.stringify(failingSymbols)} `,
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
          `${JSON.stringify(orderConfig)}: `,
          `${JSON.stringify(err)}`
        );
        return { symbol: orderConfig.symbol, success: false };
      });
  }

  /**
   * This function replaces a single Alpaca order already placed.
   * @param config: the configuration for the replacement 
   * of a single symbol order.
   * Returns the new order after replacement.
   */
  replaceOrder(
    config: ReplaceOrder
  ): Promise<Order> {
    return this._alpacaClient
      .replaceOrder(config)
      .then((order) => {
        if (this._verbose) this._logger.info(
          `REPLACE ORDER`, 
          `Successfully replaced order from symbol ${order.symbol} with config: `, 
          `${JSON.stringify(config)}`
        );
        return order;
      })
      .catch((err) => {
        this._logger.warn(
          `PLACE ORDER`,
          `Problem replacing order with config: `,
          `${JSON.stringify(config)}: `,
          `${JSON.stringify(err)}`
        );
        return err;
      });
  }

  /**
   * This function replaces many orders that already exist given some new order
   * configurations.
   * @param config: an array of order configs to replace the current ones with
   * @returns a Promise that will resolve to the results of the overall batch 
   * order placement.
   */
  replaceMultipleOrders(config: ReplaceOrder[]) {
    return P.map(
      config,
      (ro) => this.replaceOrder(ro)
    );
  }

  /**
   * 
   * @param includeAllOrders 
   * @returns 
   */

  getOrdersPlacedTodayOfType(
    orderType: OrderType,
    includeAllOrders: boolean = true
  ): Promise<Order[]> {
    return this.getOrdersPlacedToday(includeAllOrders)
      .then(orders => {
        const returnedOrders = orders.filter(o => o.type === orderType);
        if (this._verbose) this._logger.info(
          `GET ORDERS TODAY OF TYPE`, 
          `Further filtering orders down to ${returnedOrders.length}`);
        return returnedOrders;
      });
  }

  /**
   * This method returns a list of orders placed since market
   * open on the most recent day.
   * @param includeAllOrders: true if the returned orders should
   * include both orders that are still open and those that are closed.
   * @return: a promise of the orders, filtered as specified.
   */
  getOrdersPlacedToday(
    includeAllOrders: boolean = false
  ): Promise<Order[]> {
    return this._alpacaClient
      .getOrders({
        status: includeAllOrders ? 'all' : 'open',
        limit: ORDER_LIMIT_MAX,
        after: getStartOfToday(),
      })
      .then((orders) => {
        if (this._verbose) this._logger.info(
          `GET ORDERS PLACED TODAY`, 
          `Successfully retrieved ${orders.length} orders.`
        );
        return orders;
      })
      .catch((err) => {
        this._logger.error(
          `GET ORDERS PLACED TODAY`, 
          `Problem retrieving orders placed today: `, 
          JSON.stringify(err)
        );
        return err;
      });
  }

  listenForAuthentication(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._alpacaStream) {
        this._logger.error(
          'LISTEN (AUTHENTICATION)',
          'Problem listening for trade updates: AlpacaService needs to be configured with type \'stream\''
        );
        return reject('wrong type of alpaca service');
      };
      this._alpacaStream.once('authenticated', () => {
        this._logger.info(
          'LISTEN (AUTHENTICATION)',
          'Successfully authenticated to Alpaca stream :)'
        );
        return resolve();
      })
    })
  }

  listenForTradeUpdates(cb: (tu: TradeUpdate) => void): void {
    if (!this._alpacaStream) {
      this._logger.error(
        'LISTEN (TRADE UPDATES)',
        'Problem listening for trade updates: AlpacaService needs to be configured with type \'stream\''
      );
      return;
    };
    this._alpacaStream.subscribe('trade_updates');
    this._alpacaStream.on('trade_updates', cb);
  }

  stopListeningForTradeUpdates(): void {
    if (!this._alpacaStream) {
      this._logger.error(
        'LISTEN (TRADE UPDATES)',
        'Problem attempting to stop listening to trade updates: AlpacaService needs to be configured with type \'stream\''
      );
      return;
    };
    this._alpacaStream.unsubscribe('trade_updates');
    this._alpacaStream.off('trade_updates');
  }
}
