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
  // computed deltas included when emitted as an update
  price_change_pct?: number;
  volume_change_pct?: number;
  is_spike?: boolean;
}

export type TokenMap = Record<string, TokenData>;
