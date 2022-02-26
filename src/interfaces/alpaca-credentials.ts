export interface AlpacaCredentialsConfig {
  type: AlpacaCredentialsType;
  apiKeyId: string;
  secretKey: string;
  verbose?: boolean;
}

export type AlpacaCredentialsType = 'stream' | 'client';