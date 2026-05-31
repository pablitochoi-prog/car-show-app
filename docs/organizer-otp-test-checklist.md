# Organizer email OTP — manual test checklist

## Setup

- [ ] `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` configured
- [ ] `STEP_UP_COOKIE_SECRET` set (or falls back to service role key)
- [ ] Migration `20260530210000_step_up_otp` applied
- [ ] Dev accounts: site admin (MFA enrolled), organizer staff, registrar, treasurer, judge-only

## Site admin (never email OTP)

- [ ] Admin with AAL2 opens `/organizer/events/[id]/edit` — no OTP, no extra MFA
- [ ] Admin with MFA enrolled but not AAL2 on `/admin/*` — redirected to `/login/mfa`, not `/organizer/verify-otp`
- [ ] Admin with MFA enrolled but not AAL2 on sensitive organizer page — `/login/mfa`, not verify-otp
- [ ] `POST /api/organizer/otp/send` as admin — 403

## Staff (email OTP once per session)

- [ ] Organizer opens Edit — redirected to `/organizer/verify-otp`, email received
- [ ] Enter correct code — lands on intended page; cookie set
- [ ] Same session: Registrations, Reports, Messages — no second OTP
- [ ] Wrong code — friendly error; 5 failures locks challenge
- [ ] Resend — blocked for 60s, then new code works
- [ ] Registrar and treasurer roles — same OTP flow on gated pages

## Not gated

- [ ] `/dashboard/events?tab=managing` — no OTP
- [ ] `/organizer/events/new` — no OTP
- [ ] `/organizer/events/[id]/staff` — no OTP (v1)
- [ ] Public event registration API — no OTP

## Session lifecycle

- [ ] Logout clears step-up cookie; next sensitive visit requires OTP again
- [ ] Idle logout (or dev 2-min timeout) clears step-up; OTP required again
- [ ] OTP API routes do not reset idle timer incorrectly

## API

- [ ] Sensitive API without step-up — `403` + `ORGANIZER_OTP_REQUIRED`
- [ ] After verify, same-session API calls succeed

## Copy & UX

- [ ] Verify page shows privacy copy and masked email
- [ ] No “use authenticator” link on verify-otp page
