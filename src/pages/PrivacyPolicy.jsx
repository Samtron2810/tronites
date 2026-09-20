import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/useAuth";
import { FiArrowLeft } from "react-icons/fi";

const LAST_UPDATED = "September 20, 2026";

const Section = ({ title, children }) => (
  <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
    <h2 className="text-base font-semibold text-ink mb-2">{title}</h2>
    <div className="text-base text-ink-muted leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Reached both from in-app links (Settings, More — has real history to
  // pop back to) and directly from Login/Register while logged out
  // (opened fresh, or in a new tab — no useful history). window.history
  // length of 1 means this is the first entry in the tab, so "back"
  // would leave the app entirely; route home/login explicitly instead.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user ? "/" : "/login");
    }
  };

  return (
    <MainLayout>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">Privacy Policy</h1>
      <p className="text-base text-ink-muted mb-6">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Overview">
        <p>
          This Privacy Policy explains what information Tronites ("we", "us")
          collects when you use the app, why we collect it, how it's used and
          shared, and the choices and rights you have over it. It covers the
          social features, messaging, verification badges, and the payment and
          creator tools (promotions, tips, subscriptions, and payouts). By
          creating an account, you agree to the practices described here.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p><strong className="text-ink">Account information.</strong> First and last name, email address, username, password (stored as a salted hash — we never see or store your plain-text password), and an optional profile picture, bio, interests, and location (a city or region you type in yourself).</p>
        <p><strong className="text-ink">Content you create.</strong> Posts (including scheduled posts), comments, images, videos and voice notes you upload, messages you send and receive, likes, reactions, reposts, bookmarks, and your follow, block, mute, and hashtag-follow relationships.</p>
        <p><strong className="text-ink">Search activity.</strong> The text and filters of searches you run in Explore, and any searches you choose to save. These are stored on your account so they follow you across devices, and you can delete them at any time.</p>
        <p><strong className="text-ink">Payments and creator data.</strong> Payments (the Business badge fee, post promotions, tips, and creator subscriptions) are processed by Paystack on its own checkout page — we never receive or store your card number. We keep transaction records (reference, amount, status, date), and for subscriptions the payment authorization token Paystack returns and your email address so renewals can be charged. Creators who request payouts give us a bank name, account name, bank code, and account number; we store only the last four digits of the account number, not the full number.</p>
        <p><strong className="text-ink">Verification applications.</strong> Described in the Identity verification section below.</p>
        <p><strong className="text-ink">Usage & device information.</strong> For each signed-in device, the IP address and browser/device (user-agent) so you can review and sign out your sessions in Settings → Security; the same details may appear in security and moderation audit logs. We also process online/presence status (subject to your visibility setting), message read status (subject to your read-receipt setting), and, if you turn on push notifications, the push subscription details your browser gives us.</p>
        <p><strong className="text-ink">Cookies and local storage.</strong> We use strictly necessary cookies to keep you signed in — a short-lived (15-minute) access cookie and a longer-lived (30-day) refresh cookie. The app also uses your browser's local/session storage and cache for things like keeping a sign-up step in progress and loading faster. We do not use advertising or third-party tracking cookies.</p>
      </Section>

      <Section title="3. How we use your information">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To create and secure your account, including email verification and password reset via one-time codes (valid for 5 minutes).</li>
          <li>To operate core features: your feed, notifications, chat, follows, comments, hashtags, and search.</li>
          <li>To personalize your For You feed using the accounts you follow, accounts they follow, hashtags and interests you follow or choose, and engagement on posts (likes, comments, reposts). If you add a location, it is used only to show trending hashtags near you.</li>
          <li>To keep the platform safe — detecting abuse and spam, enforcing blocks, and reviewing content that is reported or flagged (see Automated moderation and AI services).</li>
          <li>To process payments, subscriptions, promotions, and creator payouts, and to keep the records needed to reconcile them.</li>
          <li>To give creators performance analytics and a shareable media-kit page, which shows public profile details (name, username, bio, profile picture, follower count, interests, location if set) and aggregated post engagement figures.</li>
          <li>To send essential account emails (verification codes, password resets, security alerts) and in-app or push notifications you've enabled. We do not send marketing email unless you opt in, and any such email will include an unsubscribe link.</li>
          <li>To maintain reliability and prevent abuse, including rate-limiting requests from your account/IP.</li>
        </ul>
        <p>Promoted posts are paid placements bought by Tronites users. People who promote a post see aggregated campaign figures such as impressions and clicks, not personal details about individual viewers. We do not sell your personal information.</p>
      </Section>

      <Section title="4. Automated moderation and AI services">
        <p>New and edited posts, comments and replies, and direct messages are automatically screened for abuse. The screening combines rule-based checks (keywords, link spam, all-caps, posting speed, new-account behaviour, and near-duplicate content) with an AI moderation service. To run the AI check, the text of the content and up to four of its image URLs — including text and images in direct messages — are sent to OpenAI's Moderation API.</p>
        <p>Screening never removes content or restricts an account on its own. When something is flagged, it is added to our moderation queue as a report and a human moderator decides what, if anything, to do. Moderators can view content that has been reported or flagged, which can include a direct message. If your account is restricted, you can submit an appeal from the sign-in screen.</p>
        <p>Separately, if you post an image and leave its alt text blank, we may send that image to OpenAI to generate a short description for accessibility. Alt text you write yourself is never sent for this purpose or overwritten.</p>
      </Section>

      <Section title="5. How your information is shared">
        <p>Your public profile, posts, and comments are visible to other users according to your privacy and visibility settings. We do not sell your personal information.</p>
        <p>We share data with a small number of service providers who help us run Tronites, under contractual confidentiality obligations:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-ink">Cloudinary</strong> — stores and processes images, videos, and voice notes you upload, including chat media and profile pictures.</li>
          <li><strong className="text-ink">MongoDB Atlas</strong> — hosts our database.</li>
          <li><strong className="text-ink">Redis</strong> — our caching, rate-limiting, and real-time delivery layer.</li>
          <li><strong className="text-ink">Brevo</strong> — delivers transactional emails (verification codes, password resets).</li>
          <li><strong className="text-ink">Paystack</strong> — processes payments and subscription charges. It receives your email and the amount being paid.</li>
          <li><strong className="text-ink">OpenAI</strong> — provides the AI moderation and automatic alt-text services described above.</li>
          <li><strong className="text-ink">Render / Vercel</strong> — host our backend and frontend infrastructure.</li>
          <li><strong className="text-ink">Browser push services</strong> (such as those run by Google, Apple, and Mozilla) — deliver push notifications if you enable them.</li>
        </ul>
        <p>We may disclose information if required by law, or to protect the rights, safety, and security of Tronites, our users, or the public.</p>
      </Section>

      <Section title="6. International transfers">
        <p>Our service providers operate data centres and systems in various countries, so your information may be processed outside the country where you live, including outside Nigeria. Where this happens, we rely on contractual protections and the providers' security commitments to keep your information protected in line with this policy and applicable law.</p>
      </Section>

      <Section title="7. Data retention">
        <p>We keep your account data for as long as your account is active. When you delete your account, it is deactivated immediately — your profile and posts stop being visible, you are signed out of every device, and any creator subscriptions you have or offer are cancelled. After a 30-day grace period the account is permanently erased. During that window you can't sign back in yourself, but you can contact support if you change your mind.</p>
        <p>The permanent erase removes your profile, posts and their media, comments, likes, bookmarks, reposts and reactions, follow/block/mute/hashtag relationships, notifications, sessions, push subscriptions, saved searches, appeals, verification applications, saved bank details, and subscription plans and subscriptions. It also permanently deletes all messages you sent or received, including the copies that other people see in those conversations.</p>
        <p>Some records are kept after deletion where necessary for accounting, safety, security, or legal compliance: payment and transaction records (verification fees, promotions, tips, subscription charges, and payouts), moderation records such as reports about individual pieces of content, moderator notes, and audit logs. Reports you filed are kept but are no longer linked to your account, and reports made against your account are deleted.</p>
        <p>Some data expires automatically: sign-in sessions after 30 days (or sooner if you sign out), one-time codes after 5 minutes, and verification applications as described under Identity verification.</p>
      </Section>

      <Section title="8. Your rights and choices">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-ink">Access & export.</strong> Download a copy of your data from Settings → Your data. The export contains your account details, posts, comments, likes, bookmarks, follower/following/blocked/muted lists (as user IDs), messages you sent and received, notifications, and reports you've filed.</li>
          <li><strong className="text-ink">Correction.</strong> Update your name, username, bio, profile picture, interests, and location directly from Settings.</li>
          <li><strong className="text-ink">Deletion.</strong> Permanently delete your account and data from Settings, subject to the grace period and retention exceptions above. You can also delete individual posts, comments, messages, and saved searches at any time.</li>
          <li><strong className="text-ink">Visibility and notification controls.</strong> Choose who can see your online status, turn read receipts and push notifications on or off, keep your location blank, review and sign out your active devices, and block or mute any account.</li>
          <li><strong className="text-ink">Automated decisions.</strong> Automated screening only flags content for human review. If you disagree with a moderation decision, you can appeal or contact us.</li>
        </ul>
        <p>Depending on where you live, you may have additional rights under laws such as the GDPR, UK GDPR, CCPA/CPRA, Nigeria's NDPA, South Africa's POPIA, or Brazil's LGPD, including the right to object to or restrict certain processing and to lodge a complaint with your local data protection authority (in Nigeria, the Nigeria Data Protection Commission). To exercise any of these rights, contact us at the address below.</p>
      </Section>

      <Section title="9. Data security">
        <p>Passwords are hashed, never stored or logged in plain text. Sessions use short-lived signed access tokens plus rotating refresh tokens stored only as secure hashes. All traffic is encrypted in transit via HTTPS. We apply rate limiting, input validation, and access controls throughout the platform. We do not log passwords or tokens, and card details are entered only on Paystack's checkout page, never on Tronites.</p>
        <p>No system is perfectly secure, and we can't guarantee absolute security of information transmitted over the internet.</p>
      </Section>

      <Section title="10. Children's privacy">
        <p>Tronites is not directed to children under 13 (or the minimum age required in your country), and we do not knowingly collect personal information from them. When you sign up, you're asked to confirm that you meet the minimum age. If you believe a child has created an account, contact us and we will take appropriate action.</p>
      </Section>

      <Section title="11. Identity verification">
        <p>
          When you apply for a verification badge, Tronites collects the
          following information for reviewer purposes: your legal name, date
          of birth, country of residence, the badge type you're applying for,
          an organization name (for organization badges), a written statement
          supporting your claim, and optional public links (e.g. website,
          LinkedIn). This information is used solely to assess and process
          your verification application.
        </p>
        <p className="mt-3">
          <strong className="text-ink">What Tronites stores:</strong> Application
          data is kept while the application is under review and for 12 months
          after a decision (approved or denied), for audit purposes, and is then
          automatically deleted. We do not collect government-issued ID
          documents or biometric data as part of this process. The one-time
          Business badge fee is paid through Paystack, and the payment record
          is retained as described under Data retention.
        </p>
        <p className="mt-3">
          <strong className="text-ink">Legal basis:</strong> Processing is
          carried out on the basis of your consent, given by voluntarily
          submitting a verification application. You may withdraw your
          application at any time before it is reviewed by contacting support.
        </p>
        <p className="mt-3">
          <strong className="text-ink">Who sees it:</strong> Only Tronites staff
          with verification-review permission can view application details.
          Your legal name, date of birth, and statement are never shown
          publicly and are not included in your public profile. Once a badge
          is granted, the badge type — and, for organization badges, the
          organization name you provided — may be displayed on your profile.
        </p>
      </Section>

      <Section title="12. Changes to this policy">
        <p>We may update this policy as Tronites evolves. Material changes will be reflected by updating the "Last updated" date above, and where appropriate, we'll notify you in-app.</p>
      </Section>

      <Section title="13. Contact us">
        <p>
          Questions about this policy or your data can be sent to{" "}
          <a href="mailto:privacy@tronites.com" className="text-primary-600 font-medium hover:underline">
            privacy@tronites.com
          </a>.
        </p>
      </Section>

      {!user && (
        <p className="text-center text-base text-ink-muted mt-6">
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link to="/signup" className="text-primary-600 font-semibold hover:underline">
            create an account
          </Link>
        </p>
      )}
    </MainLayout>
  );
};

export default PrivacyPolicy;
