-- Stellar TESTNET payout rail (demo). A spotter may link a wallet created by
-- Pollar; payouts to a linked spotter settle on testnet, every other payout
-- stays on the mock provider and never touches a chain.
alter table spotters add column stellar_address text;
alter table spotters add column pollar_user_id text;
alter table payouts add column destination text;
alter table payouts add column tx_hash text;
