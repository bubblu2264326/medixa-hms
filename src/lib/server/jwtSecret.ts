// Single source for the JWT signing/verification secret.
//
// Fail-fast (audit C3 / P0-2): refuse to fall back to a hardcoded secret. A
// known, source-committed fallback meant anyone could forge a token for any
// role (e.g. Super Admin) if `secret_key` were ever unset. This mirrors the
// DATABASE_URL guard in database/db.ts.
//
// Edge-safe: only reads process.env + uses TextEncoder (no Node APIs), so the
// middleware (Edge runtime) can import it.
if (!process.env.secret_key) {
  throw new Error(
    "secret_key is required (JWT signing/verification secret). Set it in .env.local and the deploy environment."
  );
}

export const JWT_SECRET = new TextEncoder().encode(process.env.secret_key);
