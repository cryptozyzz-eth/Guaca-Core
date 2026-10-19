import type { Pool } from 'pg';

/**
 * PayoutProvider — the ONLY seam money flows through (§3, §10). The MVP
 * wires MockPayoutProvider only; a real provider (Reloadly airtime top-ups)
 * is a documented skeleton and is NEVER active in the MVP.
 */
export interface PayoutProvider {
  readonly name: string;
  pay(input: PayoutRequest): Promise<{ status: 'pending' | 'sent' | 'failed'; providerRef?: string }>;
}

export interface PayoutRequest {
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
  recipientPhone: string;
  /** Stellar testnet address (G...) of a spotter who activated payouts. */
  recipientAddress?: string | undefined;
}

/** MVP-only provider: records the payment, sends nothing, never fails. */
export class MockPayoutProvider implements PayoutProvider {
  readonly name = 'mock';
  async pay(input: PayoutRequest) {
    return { status: 'sent' as const, providerRef: `mock:${input.idempotencyKey}` };
  }
}

/**
 * DOCUMENTED SKELETON — NOT WIRED. Reloadly airtime top-up: one API covers
 * the Caribbean, needs no bank account, is not money transmission, and reads
 * as a gift rather than a wage. Would use RELOADLY_CLIENT_ID/SECRET.
 */
export class ReloadlyPayoutProvider implements PayoutProvider {
  readonly name = 'reloadly';
  async pay(): Promise<{ status: 'pending' | 'sent' | 'failed'; providerRef?: string }> {
    throw new Error('ReloadlyPayoutProvider is a documented skeleton — not wired in the MVP');
  }
}


/** Circle's official USDC issuer on Stellar TESTNET. There is no mainnet path. */
export const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const TESTNET_HORIZON_URL = 'https://horizon-testnet.stellar.org';

/** USD minor units (cents) -> Stellar amount string with 7 decimals. */
export function minorToStellarAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(7);
}

/**
 * Demo rail: pays USDC on Stellar TESTNET from a treasury account. The network
 * passphrase and Horizon URL are fixed here on purpose; nothing in the
 * environment can point this at mainnet.
 */
export class StellarPayoutProvider implements PayoutProvider {
  readonly name = 'stellar-testnet';
  constructor(private readonly treasurySecret: string) {}

  async pay(input: PayoutRequest): Promise<{ status: 'pending' | 'sent' | 'failed'; providerRef?: string }> {
    if (!input.recipientAddress) return { status: 'failed', providerRef: 'no-destination' };
    try {
      const sdk = await import('@stellar/stellar-sdk');
      const keypair = sdk.Keypair.fromSecret(this.treasurySecret);
      const server = new sdk.Horizon.Server(TESTNET_HORIZON_URL);
      const account = await server.loadAccount(keypair.publicKey());
      const tx = new sdk.TransactionBuilder(account, {
        fee: sdk.BASE_FEE,
        networkPassphrase: sdk.Networks.TESTNET,
      })
        .addOperation(
          sdk.Operation.payment({
            destination: input.recipientAddress,
            asset: new sdk.Asset('USDC', TESTNET_USDC_ISSUER),
            amount: minorToStellarAmount(input.amountMinor),
          }),
        )
        .addMemo(sdk.Memo.text(input.idempotencyKey.replace(/-/g, '').slice(0, 28)))
        .setTimeout(60)
        .build();
      tx.sign(keypair);
      const res = await server.submitTransaction(tx);
      return { status: 'sent', providerRef: res.hash };
    } catch (err) {
      const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } }).response?.data?.extras
        ?.result_codes;
      return { status: 'failed', providerRef: codes ? JSON.stringify(codes) : (err as Error).message.slice(0, 120) };
    }
  }
}

/**
 * PAYOUT_PROVIDER=hybrid (demo): a spotter with a linked wallet is paid on
 * testnet; everyone else stays on the mock and never touches a chain.
 */
export function resolveProvider(
  recipientAddress: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): PayoutProvider {
  if (env.PAYOUT_PROVIDER === 'hybrid' && recipientAddress && env.STELLAR_TREASURY_SECRET) {
    return new StellarPayoutProvider(env.STELLAR_TREASURY_SECRET);
  }
  return new MockPayoutProvider();
}

export interface PayInput {
  missionId: string;
  spotterId: string;
  amountMinor: number;
  currency: string;
  recipientPhone?: string;
}

export interface PayResult {
  status: 'pending' | 'sent' | 'failed';
  idempotencyKey: string;
}

/**
 * Pay a mission through the configured provider. Idempotency key = mission_id
 * (the payouts.idempotency_key unique index guarantees single payment): a
 * second call for the same mission inserts nothing. Hybrid demo mode pays a
 * linked spotter on Stellar TESTNET; everyone else stays on the mock.
 */
export async function payMission(
  pool: Pool,
  input: PayInput,
  provider?: PayoutProvider,
): Promise<PayResult> {
  const sp = await pool.query<{ stellar_address: string | null }>(
    `select stellar_address from spotters where id = $1`,
    [input.spotterId],
  );
  const recipientAddress = sp.rows[0]?.stellar_address ?? undefined;
  const chosen = provider ?? resolveProvider(recipientAddress);

  // Only a verified mission can be paid. A mission that is already paid falls
  // through to the idempotent no-op below.
  const st = await pool.query<{ status: string }>(`select status from missions where id = $1`, [input.missionId]);
  const missionStatus = st.rows[0]?.status;
  if (missionStatus !== 'verified' && missionStatus !== 'paid') {
    return { status: 'failed', idempotencyKey: input.missionId };
  }

  const res = await pool.query(
    `insert into payouts (mission_id, spotter_id, provider, idempotency_key, amount_minor, currency, status, destination)
     values ($1, $2, $3, $6, $4, $5, 'pending', $7)
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      input.missionId,
      input.spotterId,
      chosen.name,
      input.amountMinor,
      input.currency,
      input.missionId,
      chosen.name === 'stellar-testnet' ? (recipientAddress ?? null) : null,
    ],
  );
  if (res.rows.length === 0) {
    // Already paid (or in flight) — idempotent no-op.
    return { status: 'sent', idempotencyKey: input.missionId };
  }

  const result = await chosen.pay({
    idempotencyKey: input.missionId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    recipientPhone: input.recipientPhone ?? '',
    recipientAddress,
  });
  await pool.query(
    `update payouts set status = $2, provider_ref = $3, tx_hash = $4 where idempotency_key = $1`,
    [
      input.missionId,
      result.status,
      result.providerRef ?? null,
      chosen.name === 'stellar-testnet' && result.status === 'sent' ? (result.providerRef ?? null) : null,
    ],
  );
  if (result.status === 'sent') {
    // Close the lifecycle: a paid mission must not sit at 'verified' forever
    // with money already moving. Guarded on status so a re-run or a race can
    // only ever move it forward, never back.
    await pool.query(
      `update missions set status = 'paid', paid_at = now()
        where id = $1 and status = 'verified'`,
      [input.missionId],
    );
  }
  return { status: result.status, idempotencyKey: input.missionId };
}
