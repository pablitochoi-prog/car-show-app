# Admin MFA test checklist

Site-admin MFA uses Supabase native TOTP. Only `User.platformRole === "ADMIN"` is affected.

## Prerequisites

- Supabase project with MFA enabled (Authentication → Providers → MFA).
- Test accounts: site admin, organizer (`ORGANIZER`), attendee (`USER`).
- Authenticator app installed (Google Authenticator, Microsoft Authenticator, Authy, or 1Password).

## Admin with MFA disabled

- [ ] Sign in as admin without MFA enrolled.
- [ ] Login succeeds without MFA challenge.
- [ ] Amber banner appears: “Admin MFA is not enabled. Please enable it in Account → Security.”
- [ ] `/admin` loads (not blocked).
- [ ] `/dashboard/security` shows **Enable Authenticator App** for admin.

## Admin enabling MFA

- [ ] Open **Dashboard → My Profile → Security** (or `/dashboard/security`).
- [ ] Click **Enable Authenticator App**.
- [ ] QR code displays; scan with authenticator app.
- [ ] Enter valid 6-digit code → “Authenticator app enabled.”
- [ ] Invalid code shows error; no secrets in browser console or network response body.
- [ ] Disable flow: enter current code → MFA removed.

## Admin login with MFA challenge

- [ ] With MFA enabled, sign out and sign in with password.
- [ ] Redirected to `/login/mfa` (not full dashboard/admin yet).
- [ ] Valid TOTP code completes login.
- [ ] Invalid code rejected.
- [ ] After verification, `/admin` and admin APIs work.

## Admin session without MFA verification

- [ ] While logged in at AAL1 with MFA enrolled, visit `/admin` directly.
- [ ] Redirected to `/login/mfa?redirect=/admin`.
- [ ] After code entry, admin access restored.

## Organizer login (no MFA)

- [ ] Sign in as organizer — no MFA step.
- [ ] No admin MFA banner.
- [ ] `/dashboard/security` shows non-admin message only.
- [ ] `/admin` redirects away (not admin).

## Attendee login (no MFA)

- [ ] Sign in as regular user — no MFA step.
- [ ] No MFA banner.
- [ ] `/dashboard/security` shows non-admin message.

## API protection

- [ ] Admin with MFA enabled but unverified session: `GET /api/admin/accounts` returns redirect via middleware (browser) or 403 from layout guards on page routes.
- [ ] Organizer calling admin API receives 403 Forbidden (existing behavior).

## Production (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and anon key set.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (admin email edits unrelated; MFA uses anon + user session).
- [ ] MFA enrollment and login challenge work on production URL.
