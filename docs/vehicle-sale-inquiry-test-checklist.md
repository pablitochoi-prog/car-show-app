# Vehicle sale inquiry — manual test checklist

Use this after deploying or before promoting a release that touches vehicle sale listings, dash-card sale QRs, or buyer inquiries.

## Organizer setup

- [ ] Event Edit → **Vehicle Sale Inquiries** can be enabled/disabled
- [ ] Setting defaults **off** for existing events
- [ ] When off, registration flows hide sale listing fields

## Owner opt-in (registration)

- [ ] Logged-in registrant: **Open to Buyer Inquiries** per vehicle when event enabled
- [ ] Guest registrant: same checkbox per vehicle
- [ ] Organizer edit registration: same fields for member and guest vehicles
- [ ] Save requires disclaimer when listing enabled
- [ ] Registration succeeds when sale section left empty/disabled
- [ ] Asking price formats as whole dollars (`$25,000`)
- [ ] Sale listing photos upload and persist

## Dash cards

- [ ] Sale QR appears in **left sidebar** only when event + listing enabled
- [ ] Location row replaced with **Owner Accepting Inquiries on this Vehicle**
- [ ] Vote QR unchanged on the right
- [ ] Sale QR scans to `/v/{vehicleEntryCode}/sale`

## Public sale page

- [ ] `/v/{code}/sale` loads for active listing
- [ ] Inactive/disabled listing shows unavailable message (not generic 404)
- [ ] Featured photo + thumbnail strip; clicking thumb swaps main photo
- [ ] Click main photo opens zoom/pan lightbox with arrows
- [ ] Owner email/phone/address never shown publicly
- [ ] Broker disclaimer visible
- [ ] Phone masks as `(###) ###-####`
- [ ] Offer field formats as whole-dollar currency
- [ ] Submit requires consent checkbox
- [ ] Confirmation page after successful submit

## Abuse prevention

- [ ] Honeypot field left empty on real submit; filled honeypot silently succeeds without email
- [ ] More than 5 inquiries/hour on same listing returns rate-limit error
- [ ] More than 5 inquiries/hour from same email returns rate-limit error
- [ ] Admin inquiry detail shows **IP hash** and **user-agent hash**, not raw IP

## Notifications

- [ ] With SendGrid configured: owner receives email with buyer contact + dashboard link (logged-in seller)
- [ ] Guest seller email has buyer details but **no** dashboard link
- [ ] Without SendGrid: inquiry saved with `FAILED_TO_SEND` status

## Owner dashboard

- [ ] `/dashboard/sale-inquiries` lists inquiries for logged-in seller
- [ ] Detail shows buyer contact, vehicle/event context, offer, message
- [ ] **Mark contacted** and **Archive** work

## Admin / organizer reporting

- [ ] `/admin/sale-inquiries` lists all inquiries with full buyer PII
- [ ] Organizer registrations page shows for-sale + inquiry **counts only** (no buyer PII)

## Regression

- [ ] `/v/{code}` vote/judge smart route still works
- [ ] Stripe checkout, OTP, MFA, idle logout unaffected
