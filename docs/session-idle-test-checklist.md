# Session idle timeout — manual test checklist

Set in `.env.local` for quick testing:

```env
NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES=2
```

Restart `npm run dev` after changing. With dev override: warning at ~1 min idle, logout at ~2 min.

Run `npx prisma migrate deploy` (or `db push`) so `User.lastActivityAt` exists.

---

## All roles

- [ ] **Admin** — log in, wait past warning threshold without input → warning modal appears
- [ ] **Organizer** — same on `/organizer/events/...`
- [ ] **Judge** — log in, open `/v/{code}?view=judge`, idle → warning then logout
- [ ] **Attendee** — log in on `/dashboard`, idle → warning then logout
- [ ] **Unauthenticated** — browse `/events`, `/v/{code}` (public vote) with no login → no modal, no forced logout

## Warning modal

- [ ] Message: session expires in ~5 minutes (or ~1 min with dev override)
- [ ] **Stay Logged In** — modal closes, timer resets, no logout
- [ ] **Log Out Now** — redirects to `/login?reason=idle`

## Auto logout

- [ ] Ignore modal until timeout → redirected to `/login?reason=idle`
- [ ] Login page shows: *You were signed out due to inactivity.*
- [ ] **Admin with MFA** — after idle logout, login requires password + MFA again

## Activity resets timer

- [ ] Mouse click / keyboard / scroll resets timer (stay active >2 min with dev override)
- [ ] Typing in a long form (no navigation) keeps session alive via heartbeat
- [ ] API autosave requests extend session (server cookie)

## Multi-tab

- [ ] Tab A idle, Tab B click → Tab A does not logout on next poll
- [ ] Activity syncs via localStorage / BroadcastChannel

## Stripe checkout

- [ ] Start paid registration checkout → redirect to Stripe
- [ ] Session not expired while on Stripe (2-hour pause cookie)
- [ ] Return from Stripe → still logged in
- [ ] Pause is **not** set when browsing generally (only on checkout redirect)

## Must not break

- [ ] Stripe webhooks still process (`/api/stripe/webhook`)
- [ ] Guest registration (no account) completes without session errors
- [ ] Public QR voting without login
- [ ] Admin MFA enroll / challenge flows
- [ ] `npm run build` passes
