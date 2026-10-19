import type { Pool } from 'pg';

/** A Stellar public key: 56 chars, starts with G, base32 alphabet. */
export function isStellarAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(value);
}

/**
 * Link the wallet a spotter created through Pollar (testnet demo). Payouts to
 * a linked spotter settle on Stellar testnet; everyone else stays on the mock.
 */
export async function linkSpotterWallet(
  pool: Pool,
  spotterId: string,
  address: string,
  pollarUserId: string | null,
): Promise<boolean> {
  if (!isStellarAddress(address)) return false;
  const res = await pool.query(
    `update spotters set stellar_address = $2, pollar_user_id = $3 where id = $1 and active`,
    [spotterId, address, pollarUserId],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function spotterWallet(pool: Pool, spotterId: string): Promise<string | null> {
  const res = await pool.query<{ stellar_address: string | null }>(
    `select stellar_address from spotters where id = $1`,
    [spotterId],
  );
  return res.rows[0]?.stellar_address ?? null;
}
