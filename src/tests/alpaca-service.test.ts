import { AlpacaService } from '../index';
import { accountData } from './account';
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
    it('getAccount', () => {
      jest.spyOn(alpacaService.alpacaClient, 'getAccount').mockResolvedValue(accountData);
      expect(alpacaService.getAccount()).resolves.toBe(accountData);
    });
  });

  describe('alpaca service: positions', () => {
    it('getPositions', () => {
      jest.spyOn(alpacaService.alpacaClient, 'getPositions').mockResolvedValue(positionData);
      expect(alpacaService.getPositions()).resolves.toBe(positionData);
    });
  });
});