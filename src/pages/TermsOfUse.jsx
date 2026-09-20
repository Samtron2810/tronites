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

const TermsOfUse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

      <h1 className="text-2xl font-bold text-ink mb-1">Terms of Use</h1>
      <p className="text-base text-ink-muted mb-6">
        Last updated: {LAST_UPDATED}
      </p>

      <Section title="1. Acceptance of terms">
        <p>
          By creating a Tronites account or using the platform, you agree to
          these Terms of Use and our Privacy Policy. If you don't agree, please
          don't use Tronites.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 13 years old (or the minimum age of digital
          consent in your country) to use Tronites, and you confirm this when
          you sign up. To make purchases or receive payouts, you must also be
          old enough to enter a binding contract where you live (18 in most
          places) or have the consent of a parent or guardian. By registering,
          you confirm the information you provide is accurate, including your
          name and email address, and that you're creating the account for
          yourself.
        </p>
      </Section>

      <Section title="3. Your account">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            You're responsible for keeping your password confidential and for
            all activity under your account. You can review and sign out your
            active devices in Settings → Security.
          </li>
          <li>
            Email addresses are verified via a one-time code at signup; you must
            have access to the email you register with.
          </li>
          <li>
            Notify us immediately at{" "}
            <a
              href="mailto:support@tronites.com"
              className="text-primary-600 font-medium hover:underline"
            >
              support@tronites.com
            </a>{" "}
            if you suspect unauthorized access to your account.
          </li>
          <li>You may delete your account at any time from Settings.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to use Tronites to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Post content that is illegal, harassing, hateful, threatening, or
            that incites violence.
          </li>
          <li>
            Impersonate another person or misrepresent your affiliation with
            anyone.
          </li>
          <li>
            Share sexually exploitative content involving minors, or any other
            content that endangers child safety.
          </li>
          <li>
            Upload malware, attempt to interfere with the platform's operation,
            or circumvent rate limits, tier limits, and security controls.
          </li>
          <li>
            Scrape, harvest, or use automated means to access Tronites without
            our written permission.
          </li>
          <li>
            Infringe someone else's intellectual property or privacy rights.
          </li>
          <li>
            Send spam or unsolicited bulk messages, or artificially inflate
            engagement, including by operating multiple or coordinated accounts
            to do so or to evade a restriction.
          </li>
        </ul>
      </Section>

      <Section title="5. Your content">
        <p>
          You retain ownership of the posts, comments, images, videos, and
          voice notes you share on Tronites ("User Content"). By posting, you
          grant Tronites a non-exclusive, worldwide, royalty-free license to
          host, store, reproduce, and display that content solely for the
          purpose of operating and improving the platform — for example,
          showing your posts in feeds, search, and to the users you share them
          with. This includes letting our service providers process your
          content on our behalf for storage, safety screening, and
          accessibility features, as described in the Privacy Policy.
        </p>
        <p>
          You're responsible for content you post and confirm you have the
          rights to share it. We may remove content that violates these Terms or
          applicable law.
        </p>
      </Section>

      <Section title="6. Messaging">
        <p>
          Direct messages are between you and the recipient, but they are not
          exempt from these Terms: messages are screened by the same automated
          safety checks as other content, and a message that is reported or
          flagged can be reviewed by our moderators.
        </p>
        <p>
          The first message to someone who isn't a mutual follower is delivered
          as a message request, which the recipient may accept or decline. When
          you delete a message you sent, it is permanently removed for both
          participants once the short undo window passes. When an account is
          permanently deleted, the conversations it took part in are deleted for
          the other participant as well.
        </p>
      </Section>

      <Section title="7. Moderation, reporting & enforcement">
        <p>
          Users can report posts, comments, messages, and accounts for review.
          Reports are handled by our moderation team through an internal review
          queue and are not made public. We also use automated checks to flag
          content for that queue; a flag alone does not remove content or
          restrict an account. Depending on severity, violations of these Terms
          may result in content removal, temporary suspension, or permanent
          account ban. Decisions may be made by moderators or administrators,
          and we may retain moderation records as needed for safety and legal
          compliance.
        </p>
        <p>
          If your account is suspended or banned, you can submit an appeal from
          the sign-in screen. Appeals are reviewed by our moderation team, who
          may uphold or reverse the decision.
        </p>
        <p>
          You can block another account at any time; blocking removes any follow
          relationship between you in both directions and limits mutual
          visibility. You can also mute an account to hide its posts and
          notifications from your own feed.
        </p>
      </Section>

      <Section title="8. Verification badges">
        <p>
          Tronites offers verification badges that confirm specific,
          checkable claims about an account (e.g. "this is a real,
          uniquely identified person"). Badges are governed as follows:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>A badge is not a guarantee of current accuracy.</strong>{" "}
            A badge means Tronites confirmed the stated claim at the time
            of verification. Circumstances can change. Tronites is not
            liable for actions taken in reliance on a badge.
          </li>
          <li>
            <strong>Misrepresentation voids the badge.</strong>{" "}
            Submitting false or misleading information, or another person's or
            organization's identity, to obtain a badge is a material breach of
            these Terms and may result in permanent account termination and
            referral to relevant authorities.
          </li>
          <li>
            <strong>Badges are revocable and may expire.</strong>{" "}
            Tronites may revoke any badge at any time — for example, if
            evidence of fraud is found, if the underlying claim lapses
            (e.g. a business deregisters), or following a serious
            violation of these Terms. Business and Creator badges are valid
            for one year and must be renewed; when a badge lapses or is
            revoked, the features tied to it (such as longer posts, editing,
            scheduling, and pinning) revert to those of your remaining tier.
          </li>
          <li>
            <strong>Fees.</strong>{" "}
            The Business badge carries a one-time verification fee, shown and
            paid in the app when you apply (see Payments below).
          </li>
          <li>
            <strong>Staff badge.</strong>{" "}
            The Tronites Staff badge is granted only to active Tronites
            employees and is revoked upon departure. Any account
            impersonating Tronites staff will be permanently banned.
          </li>
          <li>
            <strong>Verification data.</strong>{" "}
            By applying for a verification badge you agree to Tronites'
            Privacy Policy §&nbsp;Identity verification. The information
            you submit (legal name, date of birth, country, statement)
            is used solely for reviewing your application and is never
            shown publicly.
          </li>
        </ul>
      </Section>

      <Section title="9. Payments, promotions & creator tools">
        <p>
          Payments on Tronites are processed by Paystack in Nigerian naira
          (NGN). Prices, plan durations, and any fees are shown before you pay,
          and by paying you agree to Paystack's own terms for the transaction.
          If you believe you were charged in error, or a payment didn't take
          effect, email{" "}
          <a
            href="mailto:support@tronites.com"
            className="text-primary-600 font-medium hover:underline"
          >
            support@tronites.com
          </a>{" "}
          with your payment reference and we'll review it.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Promotions.</strong>{" "}
            A promotion is a paid placement of your post for the duration of
            the plan you choose. Promoted content must follow these Terms, and
            we may end or cancel a promotion that doesn't. Promotion doesn't
            guarantee any particular number of views, clicks, or engagements.
          </li>
          <li>
            <strong>Tips.</strong>{" "}
            Tips are voluntary one-time payments to a creator, within the
            minimum and maximum amounts shown in the app.
          </li>
          <li>
            <strong>Subscriptions.</strong>{" "}
            Creator subscriptions are monthly. After your first payment,
            Tronites automatically charges the payment method you authorized
            every 30 days until you cancel. Cancelling stops future charges and
            you keep access until the end of the period already paid for. If a
            renewal fails, the subscription is marked as failed and access to
            subscriber-only content ends.
          </li>
          <li>
            <strong>Creator earnings and payouts.</strong>{" "}
            Tronites deducts a platform fee from creator earnings; the current
            fee and the minimum payout amount are shown on the Creator earnings
            page. You must provide accurate bank details that belong to you.
            We may delay or withhold a payout while we investigate suspected
            fraud or a violation of these Terms. You're responsible for any
            taxes that apply to money you earn.
          </li>
          <li>
            <strong>Ending an account.</strong>{" "}
            Deleting your account cancels your subscriptions (as subscriber or
            creator). Payment records are kept as described in the Privacy
            Policy.
          </li>
        </ul>
      </Section>

      <Section title="10. Intellectual property">
        <p>
          The Tronites name, logo, and platform design are owned by us and may
          not be used without permission. Open-source components used to build
          Tronites remain subject to their respective licenses.
        </p>
        <p>
          If you believe content on Tronites infringes your copyright, email{" "}
          <a
            href="mailto:support@tronites.com"
            className="text-primary-600 font-medium hover:underline"
          >
            support@tronites.com
          </a>{" "}
          with a description of the work, a link to the content, your contact
          details, and a statement that you're the rights holder or authorized
          to act for them. We may remove the content and may suspend accounts
          that repeatedly infringe.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may delete your account at any time from Settings; it is
          deactivated immediately and permanently erased after a 30-day grace
          period, as described in the Privacy Policy. Permanent deletion also
          removes your message history for the other participants in your
          conversations, so export anything you want to keep first. We may
          suspend or terminate accounts that violate these Terms, pose a
          safety risk, or as required by law, with or without prior notice
          depending on severity.
        </p>
      </Section>

      <Section title="12. Disclaimers">
        <p>
          Tronites is provided "as is" and "as available" without warranties of
          any kind, express or implied. We don't guarantee the platform will be
          uninterrupted, error-free, or that content will be preserved without
          loss. You use Tronites at your own risk.
        </p>
      </Section>

      <Section title="13. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Tronites and its operators are
          not liable for any indirect, incidental, special, or consequential
          damages arising from your use of the platform, including loss of data,
          content, or goodwill.
        </p>
      </Section>

      <Section title="14. Governing law & disputes">
        <p>
          These Terms are governed by the laws of the Federal Republic of
          Nigeria, without regard to conflict-of-law principles, unless a
          mandatory law of your country of residence provides otherwise.
          Nothing in these Terms limits any consumer-protection rights you have
          under mandatory local law that can't be waived.
        </p>
        <p>
          Before starting a dispute resolution proceeding, please contact us —
          most issues can be resolved directly. If a dispute can't be resolved
          informally, it will be subject to the exclusive jurisdiction of the
          courts of Nigeria, except where local law requires otherwise.
        </p>
      </Section>

      <Section title="15. Changes to these terms">
        <p>
          We may update these Terms as Tronites evolves. Continued use of the
          platform after changes take effect constitutes acceptance of the
          updated Terms. Material changes will update the "Last updated" date
          above.
        </p>
      </Section>

      <Section title="16. Contact us">
        <p>
          Questions about these Terms can be sent to{" "}
          <a
            href="mailto:support@tronites.com"
            className="text-primary-600 font-medium hover:underline"
          >
            support@tronites.com
          </a>
          .
        </p>
      </Section>

      {!user && (
        <p className="text-center text-base text-ink-muted mt-6">
          <Link
            to="/login"
            className="text-primary-600 font-semibold hover:underline"
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            to="/signup"
            className="text-primary-600 font-semibold hover:underline"
          >
            create an account
          </Link>
        </p>
      )}
    </MainLayout>
  );
};

export default TermsOfUse;
