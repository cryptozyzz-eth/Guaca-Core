/**
 * Pollar (Stellar wallet infrastructure) — TESTNET ONLY for the demo.
 * The backend never signs for a user. The SDK exposes no access-token getter,
 * so the demo links the wallet address the signed-in spotter reports; a
 * production flow must verify it via POST /v1/tokens/verify first.
 */

/** Refuse to run against anything but a testnet Pollar key. */
export function assertPollarTestnet(env: NodeJS.ProcessEnv = process.env): void {
  const secret = env.POLLAR_SECRET_KEY;
  if (secret && !secret.startsWith('sec_testnet_')) {
    throw new Error('POLLAR_SECRET_KEY must be a sec_testnet_ key: this build is testnet only');
  }
  const pub = env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;
  if (pub && !pub.startsWith('pub_testnet_')) {
    throw new Error('NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY must be a pub_testnet_ key: this build is testnet only');
  }
}
