#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push-force
pnpm --filter db run seed-wallets

# One-time cleanup: Apple sign-in was removed; drop any leftover identity rows
# so the UI and /providers/linked don't reference an unsupported provider.
# Users whose ONLY sign-in method was Apple (no password, no other provider)
# are skipped to avoid stranding them — a warning is logged instead.
if [ -n "$DATABASE_URL" ]; then
  pnpm --filter db exec tsx -e "
    import { pool } from '../../lib/db/src/index.js';
    const stranded = await pool.query(\`
      SELECT pi.user_id, u.email
      FROM provider_identities pi
      JOIN users u ON u.id = pi.user_id
      WHERE pi.provider = 'apple'
        AND u.password_hash IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM provider_identities pi2
          WHERE pi2.user_id = pi.user_id AND pi2.provider <> 'apple'
        );
    \`);
    if (stranded.rows.length > 0) {
      console.warn('[post-merge] WARNING: ' + stranded.rows.length + ' user(s) only had Apple sign-in; keeping their rows so they aren\\'t locked out. Contact them to set a password or link Google:');
      for (const r of stranded.rows) console.warn('  - user_id=' + r.user_id + ' email=' + r.email);
    }
    const del = await pool.query(\`
      DELETE FROM provider_identities
      WHERE provider = 'apple'
        AND EXISTS (
          SELECT 1 FROM users u WHERE u.id = provider_identities.user_id AND u.password_hash IS NOT NULL
        )
      OR provider = 'apple' AND EXISTS (
          SELECT 1 FROM provider_identities pi2 WHERE pi2.user_id = provider_identities.user_id AND pi2.provider <> 'apple'
        );
    \`);
    console.log('[post-merge] Removed ' + del.rowCount + ' apple provider_identities row(s).');
    await pool.end();
  " || echo "[post-merge] apple cleanup skipped (non-fatal)"
fi
