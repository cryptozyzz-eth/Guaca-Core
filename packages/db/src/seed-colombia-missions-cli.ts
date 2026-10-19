import { pool } from './pool.js';
import { seedColombiaMissions } from './seed/colombiaMissions.js';

try {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEMO_SEED) {
    throw new Error('Demo missions are a demo action; set ALLOW_DEMO_SEED=1 to run them in production.');
  }
  const r = await seedColombiaMissions(pool);
  for (const [city, v] of Object.entries(r)) console.log(`${city}: ${v.missions} new missions, ${v.spotters} spotters ready`);
} finally {
  await pool.end();
}
