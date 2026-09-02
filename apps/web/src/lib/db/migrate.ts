import { pool } from './index';

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Running Drizzle database migrations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        question TEXT NOT NULL,
        kind TEXT NOT NULL,
        max_choices INT,
        integrity TEXT NOT NULL,
        visibility TEXT NOT NULL,
        allow_revision BOOLEAN NOT NULL DEFAULT true,
        opens_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closes_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        creator_token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_polls_closes_at_open 
      ON polls (closes_at) 
      WHERE closed_at IS NULL;

      CREATE TABLE IF NOT EXISTS options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        position INT NOT NULL,
        label TEXT NOT NULL,
        CONSTRAINT uq_options_poll_pos UNIQUE (poll_id, position)
      );

      CREATE TABLE IF NOT EXISTS ballots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        ballot_token_hash TEXT NOT NULL,
        choice JSONB NOT NULL,
        receipt_code TEXT NOT NULL,
        cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        revised_at TIMESTAMPTZ,
        ip_hash TEXT,
        ua_hash TEXT,
        CONSTRAINT uq_ballots_poll_token UNIQUE (poll_id, ballot_token_hash),
        CONSTRAINT uq_ballots_poll_receipt UNIQUE (poll_id, receipt_code)
      );

      CREATE INDEX IF NOT EXISTS idx_ballots_poll_cast_at 
      ON ballots (poll_id, cast_at);

      CREATE TABLE IF NOT EXISTS tallies (
        poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
        count INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (poll_id, option_id)
      );

      CREATE TABLE IF NOT EXISTS poll_results (
        poll_id UUID PRIMARY KEY REFERENCES polls(id) ON DELETE CASCADE,
        computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        payload JSONB NOT NULL
      );
    `);
    console.log('Migrations executed successfully.');
  } finally {
    client.release();
  }
}

if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
