export interface TokenData {
  token_address: string;
  token_name?: string;
  token_ticker?: string;
  canonical_symbol?: string;
  market_cap?: number;
  price_sol?: number;
  market_cap_sol?: number;
  volume_sol?: number;
  liquidity_sol?: number;
  transaction_count?: number;
  price_1hr_change?: number;
  protocol?: string;
  source?: string; // which DEX
  last_updated?: number;
}

export type TokenMap = Record<string, TokenData>;
