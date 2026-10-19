import { describe, expect, it } from 'vitest';
import { MockPayoutProvider, StellarPayoutProvider, minorToStellarAmount, resolveProvider } from '../src/payout/payouts.ts';
import { isStellarAddress } from '../src/payout/wallet.ts';

const ADDRESS = 'GARFKPAIMYCB6LJHH4DPTWOWYINGKLTHYNHCSVJI6KTPVROD7KMDKKHA';

describe('hybrid payout provider (testnet demo)', () => {
  it('uses the mock unless hybrid mode, a treasury and a linked wallet are all present', () => {
    expect(resolveProvider(ADDRESS, {})).toBeInstanceOf(MockPayoutProvider);
    expect(resolveProvider(undefined, { PAYOUT_PROVIDER: 'hybrid', STELLAR_TREASURY_SECRET: 'S' })).toBeInstanceOf(MockPayoutProvider);
    expect(resolveProvider(ADDRESS, { PAYOUT_PROVIDER: 'hybrid' })).toBeInstanceOf(MockPayoutProvider);
    expect(resolveProvider(ADDRESS, { PAYOUT_PROVIDER: 'hybrid', STELLAR_TREASURY_SECRET: 'S' })).toBeInstanceOf(
      StellarPayoutProvider,
    );
  });

  it('converts cents to a 7-decimal stellar amount', () => {
    expect(minorToStellarAmount(300)).toBe('3.0000000');
    expect(minorToStellarAmount(1)).toBe('0.0100000');
  });

  it('fails without a destination and never reaches the network', async () => {
    const r = await new StellarPayoutProvider('S-unused').pay({
      idempotencyKey: 'k', amountMinor: 300, currency: 'USD', recipientPhone: '',
    });
    expect(r.status).toBe('failed');
  });

  it('validates stellar addresses', () => {
    expect(isStellarAddress(ADDRESS)).toBe(true);
    expect(isStellarAddress('GABC')).toBe(false);
    expect(isStellarAddress('')).toBe(false);
  });
});
