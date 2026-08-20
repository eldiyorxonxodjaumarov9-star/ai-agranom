/**
 * Admin auth must not accept public AGRO_API_KEY.
 * Run: npx tsx scripts/test-admin-auth-separation.ts
 */
import { NextRequest } from "next/server";
import {
  authenticateAdminBearer,
  authenticateAdminRequest,
  createAdminCookieValue,
  verifyAdminCookie,
} from "../lib/agronom/admin-site-auth";
import { authenticateRequest } from "../lib/agronom/auth";

let passed = 0;
let failed = 0;
function ok(n: string) {
  console.log(`PASS: ${n}`);
  passed++;
}
function fail(n: string, d?: string) {
  console.error(`FAIL: ${n}${d ? " — " + d : ""}`);
  failed++;
}

process.env.AGRO_API_KEY = "public-agro-key-aaaaaaaa";
process.env.ADMIN_API_KEY = "admin-secret-key-bbbbbbbb";
process.env.ADMIN_COOKIE_SECRET = "cookie-secret-cccccccc";
(process.env as { NODE_ENV?: string }).NODE_ENV = "test";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";

{
  const pub = authenticateRequest("Bearer public-agro-key-aaaaaaaa");
  if (pub.ok) ok("public AGRO_API_KEY still works for public API");
  else fail("public AGRO_API_KEY for public API");
}

{
  const adminWithPublic = authenticateAdminBearer(
    "Bearer public-agro-key-aaaaaaaa"
  );
  if (!adminWithPublic.ok) ok("AGRO_API_KEY rejected for admin bearer");
  else fail("AGRO_API_KEY rejected for admin bearer");
}

{
  const adminOk = authenticateAdminBearer("Bearer admin-secret-key-bbbbbbbb");
  if (adminOk.ok && adminOk.actorHash) ok("ADMIN_API_KEY accepted for admin");
  else fail("ADMIN_API_KEY accepted for admin");
}

{
  const req = new NextRequest("http://localhost:3000/api/admin/kb", {
    headers: {
      Authorization: "Bearer public-agro-key-aaaaaaaa",
      Origin: "http://localhost:3000",
    },
  });
  const r = authenticateAdminRequest(req);
  if (!r.ok) ok("admin request with AGRO_API_KEY → 401 path");
  else fail("admin request with AGRO_API_KEY → 401 path");
}

{
  const auth = authenticateAdminBearer("Bearer admin-secret-key-bbbbbbbb");
  if (!auth.ok) {
    fail("cookie session setup");
  } else {
    const cookie = createAdminCookieValue(auth.actorHash);
    if (!cookie) fail("create admin cookie");
    else {
      const v = verifyAdminCookie(cookie);
      if (v.ok && v.actorHash === auth.actorHash)
        ok("admin cookie carries server actorHash");
      else fail("admin cookie actorHash", JSON.stringify(v));

      const req = new NextRequest("http://localhost:3000/api/admin/kb", {
        method: "GET",
        headers: {
          Cookie: `agro_admin_site=${cookie}`,
          Origin: "http://localhost:3000",
        },
      });
      const r = authenticateAdminRequest(req);
      if (r.ok && r.via === "cookie") ok("cookie auth admin GET");
      else fail("cookie auth admin GET", JSON.stringify(r));

      const mut = new NextRequest("http://localhost:3000/api/admin/kb", {
        method: "POST",
        headers: {
          Cookie: `agro_admin_site=${cookie}`,
          // missing Origin → CSRF reject for cookie mutation
        },
      });
      const bad = authenticateAdminRequest(mut);
      if (!bad.ok) ok("cookie mutation without Origin rejected");
      else fail("cookie mutation without Origin rejected");
    }
  }
}

console.log(`\n=== Admin auth separation: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
