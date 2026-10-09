import { Link } from "react-router-dom";
import LegalPage, {
  Section,
  Strong,
  MailLink,
  EntityLine,
} from "../components/LegalPage";
import { MIN_SIGNUP_AGE } from "../constants/legal";

const L = ({ to, children }) => (
  <Link to={to} className="text-primary-600 hover:underline">
    {children}
  </Link>
);

const TermsOfUse = () => (
  <LegalPage
    title="Terms of Use"
    description="The terms and conditions governing your use of Tronites."
    canonical="/terms"
  >
    <Section title="1. Acceptance of terms">
      <EntityLine />
      <p>
        By creating a Tronites account or using the platform, you agree to these
        Terms of Use and to our <L to="/privacy">Privacy Policy</L>. They are
        supplemented by our <L to="/guidelines">Community Guidelines</L>,{" "}
        <L to="/refunds">Refunds &amp; Cancellations</L> policy and{" "}
        <L to="/copyright">Copyright &amp; Takedowns</L> policy, which form part
        of this agreement. If you don't agree, please don't use Tronites.
      </p>
    </Section>

    <Section title="2. Eligibility and age">
      <p>
        You must be at least {MIN_SIGNUP_AGE} years old to use Tronites. We ask
        for your date of birth when you sign up to check this, and you confirm
        it is correct. If you are under 18, you should use Tronites only with the
        knowledge and permission of a parent or guardian.
      </p>
      <p>
        To make purchases, subscribe to a creator or receive payouts, you must be
        at least 18 (or the age of majority where you live) or have the consent of
        a parent or guardian, who is then responsible for the payments. By
        registering, you confirm the information you provide is accurate,
        including your name, email address and date of birth, and that you're
        creating the account for yourself. We may ask for proof of age and may
        suspend or delete an account we reasonably believe belongs to someone
        under {MIN_SIGNUP_AGE} or that was opened with a false date of birth.
      </p>
    </Section>

    <Section title="3. Your account">
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          You're responsible for keeping your password confidential and for all
          activity under your account. You can review and sign out your active
          devices in Settings → Security.
        </li>
        <li>
          Email addresses are verified via a one-time code at signup; you must
          have access to the email you register with.
        </li>
        <li>
          Notify us immediately at <MailLink /> if you suspect unauthorized
          access to your account.
        </li>
        <li>You may delete your account at any time from Settings.</li>
      </ul>
    </Section>

    <Section title="4. Acceptable use">
      <p>
        You agree to follow the <L to="/guidelines">Community Guidelines</L>. In
        particular, you agree not to use Tronites to:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          Post content that is illegal, harassing, hateful, threatening, or that
          incites violence.
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
          Upload malware, attempt to interfere with the platform's operation, or
          circumvent rate limits, tier limits and security controls.
        </li>
        <li>
          Scrape, harvest, or use automated means to access Tronites without our
          written permission.
        </li>
        <li>Infringe someone else's intellectual property or privacy rights.</li>
        <li>
          Send spam or unsolicited bulk messages, or artificially inflate
          engagement, including by operating multiple or coordinated accounts to
          do so or to evade a restriction.
        </li>
      </ul>
    </Section>

    <Section title="5. Your content">
      <p>
        You retain ownership of the posts, comments, images, videos and voice
        notes you share on Tronites ("User Content"). By posting, you grant
        Tronites a non-exclusive, worldwide, royalty-free licence to host, store,
        reproduce, adapt for display (for example resizing or transcoding), and
        display that content, and to let others view and share it as the platform
        allows, solely to operate and improve the platform. That includes showing
        your posts in feeds, search, profile and media-kit pages, on public pages
        that can be viewed without an account and in promoted placements you
        have paid for, and letting our service providers process your content on
        our behalf for storage, safety screening and accessibility features, as
        described in the Privacy Policy.
      </p>
      <p>
        The licence ends when you delete the content or your account, except that
        (a) copies other users have lawfully reposted or quoted may remain until
        they remove them, and (b) copies may persist in routine backups and
        caches for a limited time.
      </p>
      <p>
        You're responsible for content you post and confirm you have the rights
        to share it. We may remove content that violates these Terms or
        applicable law.
      </p>
    </Section>

    <Section title="6. Messaging">
      <p>
        Direct messages are between you and the recipient, but they are not
        exempt from these Terms: messages are screened by the same automated
        safety checks as other content, and a message that is reported or flagged
        can be reviewed by our moderators.
      </p>
      <p>
        The first message to someone who isn't a mutual follower is delivered as
        a message request, which the recipient may accept or decline. When you
        delete a message you sent, it is permanently removed for both
        participants once the short undo window passes. When an account is
        permanently deleted, the conversations it took part in are deleted for
        the other participant as well.
      </p>
    </Section>

    <Section title="7. Moderation, reporting and enforcement">
      <p>
        Users can report posts, comments, messages and accounts for review.
        Reports are handled by our moderation team through an internal review
        queue and are not made public. We also use automated checks to flag
        content for that queue; a flag alone does not remove content or restrict
        an account. Depending on severity, violations of these Terms may result
        in content removal, a warning ("strike"), reduced reach in feeds,
        temporary suspension, or permanent account ban. Decisions may be made by
        moderators or administrators, and we may retain moderation records as
        needed for safety and legal compliance.
      </p>
      <p>
        Strikes escalate automatically: an account that reaches 3 strikes is
        suspended for 7 days and an account that reaches 5 strikes is permanently
        banned. We may skip these steps for serious violations, such as child
        safety offences, credible threats or fraud.
      </p>
      <p>
        If your account is suspended or banned, you can submit an appeal from the
        sign-in screen. Appeals are reviewed by a person on our moderation team,
        who may uphold or reverse the decision. If we remove a post or comment,
        we will tell you which rule it broke where we reasonably can, and you can
        contact <MailLink /> to ask us to look again.
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
        Tronites offers verification badges that confirm specific, checkable
        claims about an account (e.g. "this is a real, uniquely identified
        person"). Badges are governed as follows:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>A badge is not a guarantee of current accuracy.</Strong> A badge
          means Tronites confirmed the stated claim at the time of verification.
          Circumstances can change. Tronites is not liable for actions taken in
          reliance on a badge.
        </li>
        <li>
          <Strong>Misrepresentation voids the badge.</Strong> Submitting false or
          misleading information, or another person's or organization's identity,
          to obtain a badge is a material breach of these Terms and may result in
          permanent account termination and referral to relevant authorities.
        </li>
        <li>
          <Strong>Badges are revocable and may expire.</Strong> Tronites may
          revoke any badge at any time — for example, if evidence of fraud is
          found, if the underlying claim lapses (e.g. a business deregisters), or
          following a serious violation of these Terms. Business and Creator
          badges are valid for one year and must be renewed; when a badge lapses
          or is revoked, the features tied to it (such as longer posts, editing,
          scheduling and pinning) revert to those of your remaining tier.
        </li>
        <li>
          <Strong>Fees.</Strong> The Business badge carries a one-time
          verification fee, shown and paid in the app when you apply (see
          section 9 and the <L to="/refunds">Refunds &amp; Cancellations</L>{" "}
          policy).
        </li>
        <li>
          <Strong>Staff badge.</Strong> The Tronites Staff badge is granted only
          to active Tronites employees and is revoked upon departure. Any account
          impersonating Tronites staff will be permanently banned.
        </li>
        <li>
          <Strong>Verification data.</Strong> By applying for a verification badge
          you agree to the Privacy Policy section on identity verification. The
          information you submit (legal name, date of birth, country, statement)
          is used solely for reviewing your application and is never shown
          publicly.
        </li>
      </ul>
    </Section>

    <Section title="9. Payments, promotions and creator tools">
      <p>
        Payments on Tronites are processed by Paystack in Nigerian naira (NGN).
        Prices, plan durations and any fees are shown before you pay, and by
        paying you agree to Paystack's own terms for the transaction. Prices
        include any taxes we are required to charge unless the checkout says
        otherwise. If you believe you were charged in error, or a payment didn't
        take effect, email <MailLink subject="Payment or billing question" /> with
        your payment reference and we'll review it. Refunds and cancellations are
        covered by our <L to="/refunds">Refunds &amp; Cancellations</L> policy.
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Promotions.</Strong> A promotion is a paid placement of your post
          for the duration of the plan you choose. Promoted content must follow
          these Terms, is labelled "Sponsored" to other users, and we may end or
          cancel a promotion that doesn't comply. Promotion doesn't guarantee any
          particular number of views, clicks or engagements.
        </li>
        <li>
          <Strong>Tips.</Strong> Tips are voluntary one-time payments to a
          creator, within the minimum and maximum amounts shown in the app.
        </li>
        <li>
          <Strong>Subscriptions.</Strong> Creator subscriptions are monthly. After
          your first payment, Tronites automatically charges the payment method
          you authorized every 30 days until you cancel. You can cancel at any
          time from the creator's profile; cancelling stops future charges and you
          keep access until the end of the period already paid for. If a renewal
          fails, the subscription is marked as failed and access to
          subscriber-only content ends. We will give you at least 30 days' notice
          (in the app or by email) before a price change takes effect on your
          subscription, and you can cancel before it does.
        </li>
        <li>
          <Strong>Creator earnings and payouts.</Strong> Tronites deducts a
          platform fee from creator earnings; the current fee and the minimum
          payout amount are shown on the Creator earnings page. You must be an
          adult and provide accurate bank details that belong to you. We may delay
          or withhold a payout while we investigate suspected fraud or a
          violation of these Terms, or to comply with law. You're responsible for
          reporting and paying any taxes that apply to money you earn.
        </li>
        <li>
          <Strong>Ending an account.</Strong> Deleting your account cancels your
          subscriptions (as subscriber or creator). Payment records are kept as
          described in the Privacy Policy.
        </li>
      </ul>
    </Section>

    <Section title="10. AI features">
      <p>
        Tronites uses AI to help screen content for safety and to suggest alt
        text for images that have none. These are automated tools that can make
        mistakes; moderation outcomes are decided by people (see section 7), and
        suggested alt text should be checked by the poster. Content on Tronites is
        written by users, not by AI, unless the author says otherwise.
      </p>
    </Section>

    <Section title="11. Intellectual property and takedowns">
      <p>
        The Tronites name, logo and platform design are owned by us and may not be
        used without permission. Open-source components used to build Tronites
        remain subject to their respective licences.
      </p>
      <p>
        If you believe content on Tronites infringes your copyright or
        trademark, follow the process in our{" "}
        <L to="/copyright">Copyright &amp; Takedowns</L> policy. We may remove the
        content and suspend accounts that repeatedly infringe. If your content
        was removed by mistake, you can send a counter-notice as described there.
      </p>
    </Section>

    <Section title="12. Legal requests">
      <p>
        We act on valid orders of Nigerian courts and lawful requests from
        competent authorities, including requests to remove unlawful content or
        to preserve or disclose information. Send these to{" "}
        <MailLink subject="Legal request" />. Where the law allows, we will tell
        affected users about a request concerning their account.
      </p>
    </Section>

    <Section title="13. Third-party services and links">
      <p>
        Tronites relies on third-party providers (for example Paystack for
        payments) and may contain links to websites and content we don't control.
        We aren't responsible for them, and your use of them is at your own risk
        and subject to their terms.
      </p>
    </Section>

    <Section title="14. Termination">
      <p>
        You may delete your account at any time from Settings; it is deactivated
        immediately and permanently erased after a 30-day grace period, as
        described in the Privacy Policy. Permanent deletion also removes your
        message history for the other participants in your conversations, so
        export anything you want to keep first. We may suspend or terminate
        accounts that violate these Terms, pose a safety risk, or as required by
        law, with or without prior notice depending on severity. Sections that by
        their nature should survive termination (including 5, 9, 11, 15, 16, 17
        and 18) will survive.
      </p>
    </Section>

    <Section title="15. Disclaimers">
      <p>
        Tronites is provided "as is" and "as available" without warranties of any
        kind, express or implied. We don't guarantee the platform will be
        uninterrupted, error-free, or that content will be preserved without
        loss. You use Tronites at your own risk. Nothing in these Terms limits
        rights you have under mandatory consumer-protection law.
      </p>
    </Section>

    <Section title="16. Limitation of liability and indemnity">
      <p>
        To the fullest extent permitted by law, Tronites and its operators are
        not liable for any indirect, incidental, special or consequential
        damages arising from your use of the platform, including loss of data,
        content or goodwill, and our total liability for any claim relating to
        the platform is limited to the greater of the amount you paid us in the
        12 months before the claim and ₦50,000. Nothing in these Terms excludes
        or limits liability that cannot lawfully be excluded or limited.
      </p>
      <p>
        You agree to indemnify Tronites against claims, losses and reasonable
        costs arising from content you post or from your breach of these Terms or
        of another person's rights, to the extent permitted by law.
      </p>
    </Section>

    <Section title="17. Governing law and disputes">
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria,
        without regard to conflict-of-law principles, unless a mandatory law of
        your country of residence provides otherwise. Nothing in these Terms
        limits any consumer-protection rights you have under mandatory local law
        that can't be waived.
      </p>
      <p>
        Before starting a dispute resolution proceeding, please contact us and
        give us 30 days to try to resolve it — most issues can be resolved
        directly. If a dispute can't be resolved informally, it will be subject to
        the exclusive jurisdiction of the courts of Nigeria, except where local
        law requires otherwise.
      </p>
    </Section>

    <Section title="18. General">
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Entire agreement.</Strong> These Terms and the policies they
          refer to are the whole agreement between you and Tronites about the
          platform.
        </li>
        <li>
          <Strong>Severability.</Strong> If a provision is found unenforceable,
          the rest stays in effect.
        </li>
        <li>
          <Strong>No waiver.</Strong> Not enforcing a provision isn't a waiver of
          it.
        </li>
        <li>
          <Strong>Assignment.</Strong> You may not transfer your account or these
          Terms. We may transfer them to a successor of the business.
        </li>
        <li>
          <Strong>Events beyond our control.</Strong> We aren't liable for delay or
          failure caused by events outside our reasonable control, such as power
          or network outages, provider failures or acts of government.
        </li>
        <li>
          <Strong>Notices.</Strong> We may give you notice by email to your
          account address or in the app; you can give us notice at{" "}
          <MailLink />.
        </li>
      </ul>
    </Section>

    <Section title="19. Changes to these terms">
      <p>
        We may update these Terms as Tronites evolves. For material changes we
        will email you or show a notice in the app at least 14 days before they
        take effect (sooner if the law or a security issue requires), and update
        the "Last updated" date above. Using Tronites after the effective date
        means you accept the updated Terms; if you don't, you can delete your
        account before then. We keep a record of which version you accepted and
        when.
      </p>
    </Section>

    <Section title="20. Contact us">
      <p>
        Questions about these Terms can be sent to <MailLink />.
      </p>
    </Section>
  </LegalPage>
);

export default TermsOfUse;
