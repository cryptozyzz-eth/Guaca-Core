import { describe, expect, it } from 'vitest';
import { assertPollarTestnet } from '../src/pollar.ts';

describe('assertPollarTestnet', () => {
  it('accepts testnet keys and unset keys', () => {
    expect(() => assertPollarTestnet({})).not.toThrow();
    expect(() => assertPollarTestnet({ POLLAR_SECRET_KEY: 'sec_testnet_x', NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY: 'pub_testnet_x' })).not.toThrow();
  });
  it('refuses mainnet keys', () => {
    expect(() => assertPollarTestnet({ POLLAR_SECRET_KEY: 'sec_mainnet_x' })).toThrow(/testnet/);
    expect(() => assertPollarTestnet({ NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY: 'pub_mainnet_x' })).toThrow(/testnet/);
  });
});
