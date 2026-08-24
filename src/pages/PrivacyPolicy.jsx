import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/useAuth";
import { FiArrowLeft } from "react-icons/fi";

const LAST_UPDATED = "August 24, 2026";

const Section = ({ title, children }) => (
  <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
    <h2 className="text-sm font-semibold text-ink mb-2">{title}</h2>
    <div className="text-sm text-ink-muted leading-relaxed space-y-3">
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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-xl font-bold text-ink mb-1">Privacy Policy</h1>
      <p className="text-sm text-ink-muted mb-6">Last updated: {LAST_UPDATED}</p>

      <Section title="1. Overview">
        <p>
          This Privacy Policy explains what information Tronites ("we", "us")
          collects when you use the app, why we collect it, how it's used and
          shared, and the choices and rights you have over it. By creating an
          account, you agree to the practices described here.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p><strong className="text-ink">Account information.</strong> First and last name, email address, username, password (stored as a salted hash — we never see or store your plain-text password), and an optional profile picture.</p>
        <p><strong className="text-ink">Content you create.</strong> Posts, comments, images and videos you upload, likes, bookmarks, messages you send, and your follow/block relationships.</p>
        <p><strong className="text-ink">Usage & device information.</strong> IP address, browser/user-agent, approximate session activity, and online/presence status (subject to your visibility setting).</p>
        <p><strong className="text-ink">Cookies.</strong> We use strictly necessary cookies to keep you signed in — a short-lived access-session cookie and a longer-lived refresh cookie. We do not use advertising or third-party tracking cookies.</p>
      </Section>

      <Section title="3. How we use your information">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To create and secure your account, including email verification via a one-time code and password reset.</li>
          <li>To operate core features: your feed, notifications, chat, follows, comments, and search.</li>
          <li>To keep the platform safe — detecting abuse, enforcing blocks, and reviewing content reported through our moderation tools.</li>
          <li>To send essential account emails (verification codes, password resets, security alerts). We do not send marketing email unless you opt in, and any such email will include an unsubscribe link.</li>
          <li>To maintain reliability and prevent abuse, including rate-limiting requests from your account/IP.</li>
        </ul>
      </Section>

      <Section title="4. How your information is shared">
        <p>Your public profile, posts, and comments are visible to other users according to your privacy and visibility settings. We do not sell your personal information.</p>
        <p>We share data with a small number of service providers who help us run Tronites, under contractual confidentiality obligations:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-ink">Cloudinary</strong> — stores and processes images/videos you upload.</li>
          <li><strong className="text-ink">MongoDB Atlas</strong> — hosts our database.</li>
          <li><strong className="text-ink">Brevo</strong> — delivers transactional emails (OTP codes, password resets).</li>
          <li><strong className="text-ink">Render / Vercel</strong> — host our backend and frontend infrastructure.</li>
        </ul>
        <p>We may disclose information if required by law, or to protect the rights, safety, and security of Tronites, our users, or the public.</p>
      </Section>

      <Section title="5. Data retention">
        <p>We keep your account data for as long as your account is active. If you delete your account, it is deactivated immediately — your profile and posts stop being visible to others — and permanently erased, along with associated content, after a 30-day grace period. You can contact support during that window if you change your mind.</p>
        <p>Some records, such as moderation and audit logs, may be retained longer where necessary for safety, security, or legal compliance.</p>
      </Section>

      <Section title="6. Your rights and choices">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-ink">Access & export.</strong> Download a copy of your data — posts, comments, likes, bookmarks, follows, and messages — anytime from Settings.</li>
          <li><strong className="text-ink">Correction.</strong> Update your name, username, and profile picture directly from your profile and account settings.</li>
          <li><strong className="text-ink">Deletion.</strong> Permanently delete your account and data from Settings, subject to the grace period above.</li>
          <li><strong className="text-ink">Visibility controls.</strong> Choose who can see your online/presence status, and block any account to stop interaction and visibility in both directions.</li>
        </ul>
        <p>Depending on where you live, you may have additional rights under laws such as the GDPR, UK GDPR, CCPA/CPRA, Nigeria's NDPA, South Africa's POPIA, or Brazil's LGPD, including the right to lodge a complaint with your local data protection authority.</p>
      </Section>

      <Section title="7. Data security">
        <p>Passwords are hashed, never stored or logged in plain text. Sessions use short-lived signed access tokens plus rotating refresh tokens stored only as secure hashes. All traffic is encrypted in transit via HTTPS. We apply rate limiting, input validation, and access controls throughout the platform, and we do not log passwords, tokens, or payment details.</p>
        <p>No system is perfectly secure, and we can't guarantee absolute security of information transmitted over the internet.</p>
      </Section>

      <Section title="8. Children's privacy">
        <p>Tronites is not directed to children under 13 (or the minimum age required in your country), and we do not knowingly collect personal information from them. If you believe a child has created an account, contact us and we will take appropriate action.</p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>We may update this policy as Tronites evolves. Material changes will be reflected by updating the "Last updated" date above, and where appropriate, we'll notify you in-app.</p>
      </Section>

      <Section title="10. Contact us">
        <p>
          Questions about this policy or your data can be sent to{" "}
          <a href="mailto:privacy@tronites.com" className="text-primary-600 font-medium hover:underline">
            privacy@tronites.com
          </a>.
        </p>
      </Section>

      {!user && (
        <p className="text-center text-sm text-ink-muted mt-6">
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
