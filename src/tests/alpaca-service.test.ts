import { AlpacaService } from '../index';
import { accountData } from './constants';

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
});
