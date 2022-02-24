import { AlpacaService } from '../services';
import { accountData } from './account';
import { clockData } from './clock';
import { positionData } from './position';

describe('alpaca service tests', () => {
  let alpacaService: AlpacaService;

  beforeEach(() => {
    alpacaService = new AlpacaService({
      apiKeyId: 'some-api-key',
      secretKey: 'some-secret-key',
    });
  });

  describe('alpaca service: accounts', () => {
    it('getAccount', async () => {
      jest.spyOn(alpacaService.alpacaClient, 'getAccount').mockResolvedValue(accountData);
      await expect(alpacaService.getAccount()).resolves.toBe(accountData);
    });
  });

  describe('alpaca service: positions', () => {
    it('getPositions', async () => {
      jest.spyOn(alpacaService.alpacaClient, 'getPositions').mockResolvedValue(positionData);
      await expect(alpacaService.getPositions()).resolves.toBe(positionData);
    });
  });

  describe('alpaca service: clock', () => {
    it('isMarketOpenNow: case where market is open should return true', async () => {
      jest.spyOn(alpacaService.alpacaClient, 'getClock').mockResolvedValue(clockData(true));
      await expect(alpacaService.isMarketOpenNow()).resolves.toBeTruthy();
    });
    it('isMarketOpenNow: case where market is not open should return false', async () => {
      jest.spyOn(alpacaService.alpacaClient, 'getClock').mockResolvedValue(clockData(false));
      await expect(alpacaService.isMarketOpenNow()).resolves.toBeFalsy();
    });
  });
});
