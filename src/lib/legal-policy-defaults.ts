import { sanitizePolicyHtml } from "@/lib/sanitize-policy-html";

/** Default SMS notice shown in the admin editor and on /terms when not yet published in admin. */
export const DEFAULT_SMS_TEXT_POLICY_HTML = sanitizePolicyHtml(`
<h2>Car Show Scout SMS Notifications</h2>
<p>Car Show Scout, LLC (&quot;Car Show Scout&quot;) may send SMS text messages to mobile numbers you provide when you opt in during registration, profile settings, or buyer inquiry flows.</p>
<h3>Program description</h3>
<p>Messages relate to car show event participation, including registration and check-in updates, voting and judging notifications, buyer-interest inquiries, event communications from organizers, and account or support responses.</p>
<h3>Message frequency</h3>
<p>Message frequency varies depending on your event activity and notification preferences.</p>
<h3>Rates</h3>
<p>Message and data rates may apply.</p>
<h3>Opt out and help</h3>
<p>Reply <strong>STOP</strong> to unsubscribe from Car Show Scout SMS notifications. Reply <strong>HELP</strong> for help.</p>
<h3>Consent</h3>
<p>SMS consent is not required as a condition of registration, purchase, voting, judging, or event participation. You may register, submit a vehicle, vote, judge, participate in an event, or make a purchase without agreeing to receive SMS messages.</p>
<h3>Privacy</h3>
<p>See our <a href="/privacy">Privacy Policy</a> for how we handle personal information, including mobile phone numbers. Car Show Scout does not sell or share mobile phone numbers or SMS consent information with third parties or affiliates for marketing or promotional purposes.</p>
<p>Additional SMS program details are available on our <a href="/sms">SMS Program page</a>.</p>
`);

/** Default privacy policy shown on /privacy when not yet published in admin. */
export const DEFAULT_PRIVACY_POLICY_HTML = sanitizePolicyHtml(`
<h2>Privacy Policy</h2>
<p>Car Show Scout, LLC (&quot;Car Show Scout&quot;) operates the CarShowScout platform for car show discovery, event registration, judging, voting, and organizer tools.</p>
<h3>Information we collect</h3>
<p>We collect information you provide when you create an account, register for events, submit vehicles, vote or judge, communicate with organizers, or contact support. This may include your name, email address, mailing address, vehicle details, and mobile phone number when you choose to provide it.</p>
<h3>How we use information</h3>
<p>We use your information to operate the platform, process registrations and payments, facilitate voting and judging, deliver optional SMS notifications you opt into, respond to support requests, and improve our services.</p>
<h3>SMS and mobile phone numbers</h3>
<p>If you opt in to SMS notifications, we use your mobile phone number to send messages described in our <a href="/sms">SMS Program page</a> and <a href="/terms">SMS Text Policy</a>. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe and HELP for help.</p>
<p><strong>Car Show Scout does not sell or share mobile phone numbers or SMS consent information with third parties or affiliates for marketing or promotional purposes.</strong></p>
<h3>Sharing with service providers</h3>
<p>We use trusted service providers (such as hosting, email, payment, and SMS delivery partners) to operate the platform. They process data on our behalf under contractual obligations and not for their own marketing use of your SMS consent or mobile number.</p>
<h3>Contact</h3>
<p>Questions about this policy: <a href="mailto:support@carshowscout.com">support@carshowscout.com</a>.</p>
`);
