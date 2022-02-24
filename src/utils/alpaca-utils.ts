import { AlpacaCredentialsConfig } from '../interfaces';

export function generateAlpacaCredentials(verbose: boolean = true): AlpacaCredentialsConfig {
  return {
    apiKeyId: process.env.ALPACA_API_KEY_ID as string,
    secretKey: process.env.ALPACA_SECRET_KEY as string,
    verbose,
  };
}
