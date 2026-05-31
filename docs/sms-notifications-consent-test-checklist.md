# SMS notifications consent — manual test checklist

Use this after deploying or before promoting a release that touches event registration SMS opt-in, buyer-inquiry SMS prompts, or profile SMS preferences.

## Prerequisites

- [ ] Test accounts: one with **active profile SMS opt-in** (`smsNotificationsOptIn = true`, `smsNotificationsOptOutAt = null`), one **never opted in**, one with **prior opt-out** (`smsNotificationsOptOutAt` set)
- [ ] Event with **Vehicle Sale Inquiries** enabled (for buyer-inquiry dialog scenarios)
- [ ] Optional: DB access to confirm `User` SMS fields after submit

---

## 1. Logged-in user — active profile SMS opt-in (no active opt-out)

**Setup:** Sign in as user with active profile SMS consent and a saved phone number.

### Event registration

- [ ] SMS checkbox on Contact Information is **checked by default**
- [ ] Full TCPA disclosure paragraph is **hidden**
- [ ] Compact hint appears: “SMS notifications enabled… **My Profile**”
- [ ] Submitting registration succeeds without re-displaying full legal text

### Buyer inquiry dialog (during registration)

- [ ] Enable **Open to buyer inquiries** on a vehicle → dialog opens
- [ ] **No** compact buyer-inquiry SMS opt-in block appears in the dialog
- [ ] Dialog Save/Cancel works without errors

---

## 2. Logged-in user — no profile SMS opt-in

**Setup:** Sign in as user who has never opted in (or has no active opt-in).

### Event registration

- [ ] SMS checkbox is **unchecked by default**
- [ ] **Full** SMS legal disclosure is visible (Terms, Privacy Policy, STOP, HELP, frequency, rates, optional-consent language)
- [ ] Checking SMS without a phone blocks submit with: “Enter a phone number to receive SMS notifications.”
- [ ] Checking SMS **with** a valid phone allows submit

### Buyer inquiry dialog

- [ ] With **Open to buyer inquiries** selected, compact buyer-inquiry SMS opt-in appears when dialog opens
- [ ] Compact disclosure includes STOP, HELP, frequency, rates, optional-consent, Terms, Privacy Policy
- [ ] Checking SMS in dialog without contact phone blocks Save with phone-required message
- [ ] Checking SMS in dialog, entering phone in Contact Information, saving dialog, then **submitting registration** persists profile SMS opt-in (verify in My Profile or DB: `smsNotificationsOptIn = true`, consent metadata populated)

---

## 3. Logged-in user — prior opt-out

**Setup:** User with `smsNotificationsOptIn = true` and `smsNotificationsOptOutAt` set (or equivalent “opted out” state).

- [ ] My Profile shows SMS **unchecked** (not actively opted in)
- [ ] Event registration treats user as **not opted in**: checkbox unchecked by default, **full** disclosure shown
- [ ] Buyer inquiry dialog shows compact SMS opt-in when opening buyer inquiries (same as scenario 2)
- [ ] Re-opting in on registration saves fresh consent metadata and clears opt-out timestamp

---

## 4. SMS opt-in checked but no phone number

### Logged-in registration

- [ ] Check SMS opt-in, clear/remove phone → submit blocked with clear validation message
- [ ] No partial/invalid SMS consent saved on registration or profile without a valid phone

### Guest registration

- [ ] Same phone-required validation when SMS is checked
- [ ] Guest submit blocked until phone provided

### Buyer inquiry dialog (logged-in)

- [ ] Check SMS in dialog without contact phone → Save blocked with phone-required message

### Public buyer inquiry form (`/v/{code}/sale`)

- [ ] Logged-in user without profile opt-in: SMS opt-in requires buyer phone field when checked

---

## 5. Guest / unauthenticated registration

- [ ] Guest registration form always shows **full** SMS disclosure (no “already opted in at profile” compact hint)
- [ ] Open buyer inquiry dialog on a guest vehicle → dialog **does not crash**
- [ ] Guest buyer inquiry dialog does **not** show profile-linked SMS opt-in block (no `showSmsOptIn`)
- [ ] Guest registration submit behavior unchanged aside from existing SMS checkbox on main form
- [ ] No profile update attempted for guest (no authenticated user)

---

## 6. First-time consent copy compliance

Verify on each surface where **first-time** consent is requested:

| Surface | Full disclosure | Compact buyer-inquiry disclosure |
|--------|-----------------|----------------------------------|
| Logged-in event registration (not opted in) | ✓ | — |
| Guest event registration | ✓ | — |
| Buyer inquiry dialog (logged-in, not opted in) | — | ✓ |
| Public buyer inquiry form (not opted in at profile) | ✓ | — |
| My Profile → Details sheet | ✓ | — |

Each first-time surface must include:

- [ ] **Terms** link → `https://events.carshowscout.com/terms`
- [ ] **Privacy Policy** link → `https://events.carshowscout.com/privacy`
- [ ] Reply **STOP** to opt out
- [ ] **HELP** for help
- [ ] Message **frequency varies**
- [ ] Message and **data rates** may apply
- [ ] SMS consent is **not required** as a condition of purchase or participation

---

## 7. Profile & API regression

- [ ] My Profile SMS toggle still saves via PATCH `/api/me`
- [ ] Opting out in profile sets `smsNotificationsOptOutAt`
- [ ] Registration edit flow respects same SMS UI rules as new registration
- [ ] Organizer edit registration for member respects profile opt-in state

---

## Automated tests

Run unit tests covering consent logic and validation:

```bash
npm run test -- src/lib/sms-notifications-consent.test.ts \
  src/lib/sms-notifications-consent-ui.test.ts \
  src/lib/sms-notifications-disclosure-content.test.ts \
  src/lib/validation/sms-notifications-consent.test.ts \
  src/lib/validation/profile.test.ts \
  src/lib/validation/registration-sms.test.ts \
  src/lib/validation/vehicle-sale-inquiry.test.ts
```
