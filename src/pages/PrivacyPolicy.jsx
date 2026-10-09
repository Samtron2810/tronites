import { Link } from "react-router-dom";
import LegalPage, {
  Section,
  Strong,
  MailLink,
  EntityLine,
} from "../components/LegalPage";
import { CONTACT, MIN_SIGNUP_AGE } from "../constants/legal";

const PrivacyPolicy = () => (
  <LegalPage
    title="Privacy Policy"
    description="How Tronites collects, uses, shares and protects your personal information, and the rights you have over it."
    canonical="/privacy"
  >
    <Section title="1. Who we are and what this covers">
      <EntityLine />
      <p>
        This Privacy Policy explains what personal information Tronites ("we",
        "us") collects when you use the app, why we collect it, who we share it
        with, how long we keep it, and the rights and choices you have. We act
        as the "data controller" for the information described here. It covers
        the social features, messaging, verification badges, and the payment
        and creator tools (promotions, tips, subscriptions and payouts). It is
        written to meet Nigeria's Data Protection Act 2023 (NDPA) and, where
        they apply to you, similar laws such as the GDPR and UK GDPR.
      </p>
      <p>
        Please read it together with our{" "}
        <Link to="/terms" className="text-primary-600 hover:underline">
          Terms of Use
        </Link>
        .
      </p>
    </Section>

    <Section title="2. Information we collect">
      <p>
        <Strong>Account information.</Strong> First and last name, email
        address, username, password (stored only as a salted hash — we never see
        or store your plain-text password), your <Strong>date of birth</Strong>,
        and an optional profile picture, bio, interests and location (a city or
        region you type in yourself).
      </p>
      <p>
        <Strong>Date of birth.</Strong> We ask for it at sign-up only to check
        you meet the minimum age ({MIN_SIGNUP_AGE}). It is stored on your
        account, is never shown on your profile or to other users, and is
        included in your data export. If you are under the minimum age, we
        reject the sign-up and do not create an account.
      </p>
      <p>
        <Strong>Consent record.</Strong> When you create an account we record
        that you accepted the Terms of Use and this Privacy Policy, the date and
        time, and which version of them you accepted. We also record whether you
        chose to receive marketing email, and when you last changed that choice.
      </p>
      <p>
        <Strong>Content you create.</Strong> Posts (including scheduled posts),
        comments, images, videos and voice notes you upload, messages you send
        and receive, likes, reactions, reposts, bookmarks, and your follow,
        block, mute and hashtag-follow relationships.
      </p>
      <p>
        <Strong>Search activity.</Strong> The text and filters of searches you
        run in Explore, and any searches you choose to save. These are stored on
        your account so they follow you across devices, and you can delete them
        at any time.
      </p>
      <p>
        <Strong>Payments and creator data.</Strong> Payments (the Business badge
        fee, post promotions, tips and creator subscriptions) are processed by
        Paystack on its own checkout page — we never receive or store your card
        number. We keep transaction records (reference, amount, status, date),
        and for subscriptions the payment authorization token Paystack returns
        and your email address so renewals can be charged. Creators who request
        payouts give us a bank name, account name, bank code and account number;
        we store only the last four digits of the account number, not the full
        number.
      </p>
      <p>
        <Strong>Verification applications.</Strong> Described in section 12
        below.
      </p>
      <p>
        <Strong>Usage and device information.</Strong> For each signed-in device,
        the IP address and browser/device (user-agent) so you can review and sign
        out your sessions in Settings → Security, and so we can send a new-device
        sign-in alert. The same details appear in security and moderation audit
        logs when an action involves your account. We also process online
        (presence) status, subject to your visibility setting; message read
        status, subject to your read-receipt setting; and, if you turn on push
        notifications, the push subscription details your browser gives us.
      </p>
      <p>
        <Strong>Cookies and browser storage.</Strong> See section 14.
      </p>
    </Section>

    <Section title="3. Why we use your information (legal bases)">
      <p>
        Under the NDPA we must have a lawful basis for each use of your
        information. Ours are:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Contract</Strong> — to create and run your account and provide
          the features you ask for: sign-in, feed, posts, comments, chat,
          follows, search, notifications, payments, subscriptions, promotions,
          payouts and creator analytics.
        </li>
        <li>
          <Strong>Legitimate interests</Strong> — to keep Tronites safe and
          reliable: detecting spam and abuse, screening content, enforcing our
          rules, preventing fraud, rate-limiting, securing accounts, and
          improving and personalizing the For You feed. We balance these against
          your rights and you can object (section 9).
        </li>
        <li>
          <Strong>Legal obligation</Strong> — keeping financial records,
          responding to lawful requests from courts and authorities, and
          meeting our data-protection duties (including breach notification and
          recording your consent).
        </li>
        <li>
          <Strong>Consent</Strong> — for optional things: marketing email,
          push notifications, identity-verification applications, and creating
          your account in the first place by accepting the Terms. You can
          withdraw consent at any time (it does not affect processing already
          done).
        </li>
      </ul>
    </Section>

    <Section title="4. How we use your information">
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          To create and secure your account, including email verification and
          password reset via one-time codes (valid for 5 minutes) and new-device
          alerts.
        </li>
        <li>
          To operate core features: your feed, notifications, chat, follows,
          comments, hashtags and search.
        </li>
        <li>
          To personalize your For You feed using the accounts you follow,
          accounts they follow, hashtags and interests you follow or choose, and
          engagement on posts (likes, comments, reposts). If you add a location,
          it is used only to show trending hashtags near you.
        </li>
        <li>
          To keep the platform safe — detecting abuse and spam, enforcing
          blocks, and reviewing content that is reported or flagged (section 5).
        </li>
        <li>
          To process payments, subscriptions, promotions and creator payouts,
          and to keep the records needed to reconcile them.
        </li>
        <li>
          To give creators performance analytics and a shareable media-kit page,
          which shows public profile details (name, username, bio, profile
          picture, follower count, interests, location if set) and aggregated
          post engagement figures.
        </li>
        <li>
          To send essential account emails (verification codes, password resets,
          security alerts, important notices about these policies) and in-app or
          push notifications you've enabled.
        </li>
        <li>
          To send product announcements <Strong>only if you opted in</Strong>
          (section 13).
        </li>
        <li>
          To enforce our rules, meet legal obligations and respond to lawful
          requests.
        </li>
      </ul>
      <p>
        Promoted posts are paid placements bought by Tronites users. People who
        promote a post see aggregated campaign figures such as impressions and
        clicks, not personal details about individual viewers. We do not sell
        your personal information.
      </p>
    </Section>

    <Section title="5. Automated moderation, AI and automated enforcement">
      <p>
        <Strong>AI and rule-based screening.</Strong> New and edited posts,
        comments and replies, and direct messages are automatically screened for
        abuse. The screening combines rule-based checks (keywords, link spam,
        all-caps, posting speed, new-account behaviour and near-duplicate
        content across accounts) with an AI moderation service. To run the AI
        check, the text of the content and up to four of its image URLs —
        including text and images in direct messages — are sent to OpenAI's
        Moderation API. Screening never removes content or restricts an account
        on its own: a flagged item is added to our moderation queue as a report
        and a human moderator decides what, if anything, to do. Accounts that
        receive several reports in a short time are moved up the queue. Moderators
        can view content that has been reported or flagged, which can include a
        direct message.
      </p>
      <p>
        <Strong>Automatic alt text.</Strong> If you post an image and leave its
        alt text blank, we may send that image to OpenAI to generate a short
        description for accessibility. Alt text you write yourself is never sent
        for this purpose or overwritten.
      </p>
      <p>
        <Strong>Automatic consequences of warnings.</Strong> Moderators can
        record a warning ("strike") against an account. When an account reaches
        3 strikes it is automatically suspended for 7 days, and at 5 strikes it
        is automatically and permanently banned. Moderators can also reduce how
        widely an account's posts are recommended in feeds ("limiting reach").
        These steps start from a decision a human moderator made, but the
        suspension or ban that follows a strike threshold happens automatically.
      </p>
      <p>
        <Strong>Your right to human review.</Strong> If you think a decision was
        wrong, you can submit an appeal from the sign-in screen, and appeals are
        reviewed by a person who may uphold or reverse the decision. You can also
        contact us at <MailLink address={CONTACT.privacy} />.
      </p>
    </Section>

    <Section title="6. Who we share your information with">
      <p>
        Your public profile, posts and comments are visible to other users
        according to your privacy and visibility settings. Public profiles,
        posts and hashtags can also be viewed without an account and may be
        indexed by search engines. We do not sell your personal information.
      </p>
      <p>
        <Strong>Other users and creators.</Strong> If you subscribe to a creator,
        they can see that you are an active subscriber (your name, username and
        profile picture). If you send a tip, the creator sees your name and any
        message you included unless you choose to tip anonymously.
      </p>
      <p>
        <Strong>Service providers.</Strong> We share data with a small number of
        providers who help us run Tronites, under contractual confidentiality and
        data-protection obligations:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Cloudinary</Strong> — stores and processes images, videos and
          voice notes you upload, including chat media and profile pictures.
        </li>
        <li>
          <Strong>MongoDB Atlas</Strong> — hosts our database.
        </li>
        <li>
          <Strong>Redis</Strong> — our caching, rate-limiting and real-time
          delivery layer.
        </li>
        <li>
          <Strong>Brevo</Strong> — delivers our emails (verification codes,
          password resets, security alerts and, if you opted in, announcements).
        </li>
        <li>
          <Strong>Paystack</Strong> — processes payments, subscription charges
          and payouts. It receives your email, the amount being paid and, for
          payouts, the bank details you provide.
        </li>
        <li>
          <Strong>OpenAI</Strong> — provides the AI moderation and automatic
          alt-text services described in section 5.
        </li>
        <li>
          <Strong>Render and Vercel</Strong> — host our backend and frontend
          infrastructure.
        </li>
        <li>
          <Strong>Browser push services</Strong> (such as those run by Google,
          Apple and Mozilla) — deliver push notifications if you enable them.
        </li>
      </ul>
      <p>
        <Strong>Legal and safety disclosures.</Strong> We may disclose
        information if required by a court order, law or lawful request from a
        competent authority, or where necessary to protect the rights, safety
        and security of Tronites, our users or the public (for example, to
        report child sexual exploitation material). We review each request and
        disclose only what is required.
      </p>
      <p>
        <Strong>Business changes.</Strong> If Tronites is involved in a merger,
        acquisition or sale of assets, your information may be transferred to
        the new owner, who must honour this policy; we will tell you first.
      </p>
    </Section>

    <Section title="7. International transfers">
      <p>
        Our service providers operate data centres and systems in various
        countries, so your information may be processed outside Nigeria. Where
        this happens we rely on the safeguards the NDPA allows — such as
        adequacy of protection in the destination country, contractual
        protections in our agreements with the provider, or your consent — and
        on the providers' security commitments. You can ask which countries
        apply to a given provider by contacting{" "}
        <MailLink address={CONTACT.privacy} />.
      </p>
    </Section>

    <Section title="8. How long we keep your information">
      <p>
        We keep your account data for as long as your account is active. When
        you delete your account, it is deactivated immediately — your profile
        and posts stop being visible, you are signed out of every device, and
        any creator subscriptions you have or offer are cancelled. After a
        30-day grace period the account is permanently erased. During that
        window you can't sign back in yourself, but you can contact support if
        you change your mind.
      </p>
      <p>
        The permanent erase removes your profile (including your date of birth
        and consent record), posts and their media, comments, likes, bookmarks,
        reposts and reactions, follow/block/mute/hashtag relationships,
        notifications, sessions, push subscriptions, saved searches, appeals,
        verification applications, saved bank details, and subscription plans
        and subscriptions. It also permanently deletes all messages you sent or
        received, including the copies other people see in those conversations.
      </p>
      <p>
        Some records are kept after deletion where necessary for accounting,
        safety, security or legal compliance:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Payment and transaction records</Strong> (verification fees,
          promotions, tips, subscription charges and payouts) — kept for as long
          as accounting, tax, fraud-prevention and legal rules require,
          generally up to six years.
        </li>
        <li>
          <Strong>Moderation records</Strong> — reports about individual pieces
          of content, moderator notes and audit logs (which include the IP
          address and device involved in an action). We keep these for as long
          as needed for safety, abuse prevention and legal purposes and do not
          currently delete them automatically. Reports you filed are kept but
          are no longer linked to your account, and reports made against your
          account are deleted.
        </li>
      </ul>
      <p>
        Some data expires automatically: sign-in sessions after 30 days (or
        sooner if you sign out), one-time codes after 5 minutes, and
        verification applications as described in section 12.
      </p>
    </Section>

    <Section title="9. Your rights and choices">
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>Access and portability.</Strong> Download a copy of your data
          from Settings → Your data. The export includes your account details
          (including date of birth and consent record), posts, comments, likes,
          bookmarks, follower/following/blocked/muted lists (as user IDs),
          messages you sent and received, notifications, reports you've filed,
          saved searches, appeals, active sessions, verification applications
          and payments, promotion campaigns, tips, subscriptions, payout bank
          details (last four digits only) and payout records. Authentication
          secrets and payment-provider tokens are not included.
        </li>
        <li>
          <Strong>Correction.</Strong> Update your name, username, bio, profile
          picture, interests and location directly from Settings. To correct your
          date of birth or email address, contact us.
        </li>
        <li>
          <Strong>Deletion.</Strong> Permanently delete your account and data
          from Settings, subject to the grace period and retention exceptions in
          section 8. You can also delete individual posts, comments, messages and
          saved searches at any time.
        </li>
        <li>
          <Strong>Objection and restriction.</Strong> You can object to
          processing based on our legitimate interests and ask us to restrict
          processing while a dispute is resolved.
        </li>
        <li>
          <Strong>Withdraw consent.</Strong> Turn off marketing email and push
          notifications in Settings, or use the unsubscribe link in any
          announcement email.
        </li>
        <li>
          <Strong>Visibility and notification controls.</Strong> Choose who can
          see your online status, turn read receipts and push notifications on or
          off, keep your location blank, review and sign out your active devices,
          and block or mute any account.
        </li>
        <li>
          <Strong>Automated decisions.</Strong> See section 5 — you can ask for a
          person to review any moderation decision.
        </li>
      </ul>
      <p>
        To exercise any right that isn't available in Settings, email{" "}
        <MailLink address={CONTACT.privacy} />. We will respond within one month
        and may need to verify it's really you. You also have the right to
        complain to the Nigeria Data Protection Commission (NDPC) or, if you live
        elsewhere, your local data protection authority. Depending on where you
        live you may have further rights under laws such as the GDPR, UK GDPR,
        CCPA/CPRA, POPIA or LGPD.
      </p>
    </Section>

    <Section title="10. Data security and breaches">
      <p>
        Passwords are hashed, never stored or logged in plain text. Sessions use
        short-lived signed access tokens plus rotating refresh tokens stored only
        as secure hashes. All traffic is encrypted in transit via HTTPS. We apply
        rate limiting, input validation and access controls throughout the
        platform, and we do not log passwords or tokens. Card details are entered
        only on Paystack's checkout page, never on Tronites.
      </p>
      <p>
        No system is perfectly secure. If a personal-data breach is likely to put
        your rights and freedoms at risk, we will notify the NDPC within 72 hours
        of becoming aware of it and will tell affected users without undue delay,
        explaining what happened and what you can do.
      </p>
    </Section>

    <Section title="11. Children and age">
      <p>
        Tronites is not directed to children under {MIN_SIGNUP_AGE}. We ask for
        your date of birth when you sign up and do not create accounts for people
        under {MIN_SIGNUP_AGE}; we do not knowingly collect personal information
        from them. If you believe a child under {MIN_SIGNUP_AGE} has an account,
        contact us and we will delete it.
      </p>
      <p>
        Under Nigerian law a person under 18 is a child, and we ask anyone under
        18 to use Tronites only with the knowledge and permission of a parent or
        guardian. Purchases, subscriptions and payouts are intended for adults
        (see the Terms of Use). A parent or guardian who wants to see, correct or
        delete a child's information can contact{" "}
        <MailLink address={CONTACT.privacy} />.
      </p>
    </Section>

    <Section title="12. Identity verification">
      <p>
        When you apply for a verification badge, Tronites collects the following
        information for reviewer purposes: your legal name, date of birth,
        country of residence, the badge type you're applying for, an organization
        name (for organization badges), a written statement supporting your
        claim, and optional public links (e.g. website, LinkedIn). This
        information is used solely to assess and process your verification
        application.
      </p>
      <p>
        <Strong>What Tronites stores:</Strong> Application data is kept while the
        application is under review and for 12 months after a decision (approved
        or denied), for audit purposes, and is then automatically deleted. We do
        not collect government-issued ID documents or biometric data as part of
        this process. The one-time Business badge fee is paid through Paystack,
        and the payment record is retained as described in section 8.
      </p>
      <p>
        <Strong>Legal basis:</Strong> Consent, given by voluntarily submitting a
        verification application. You may withdraw your application at any time
        before it is reviewed by contacting support.
      </p>
      <p>
        <Strong>Who sees it:</Strong> Only Tronites staff with
        verification-review permission can view application details. Your legal
        name, date of birth and statement are never shown publicly. Once a badge
        is granted, the badge type — and, for organization badges, the
        organization name you provided — may be displayed on your profile.
      </p>
    </Section>

    <Section title="13. Email">
      <p>
        <Strong>Essential emails</Strong> — verification codes, password resets,
        new-device and security alerts, and notices about changes to our Terms or
        this policy — are sent regardless of your marketing choice because they
        are necessary to run your account.
      </p>
      <p>
        <Strong>Announcement (marketing) emails</Strong> are opt-in. They are off
        unless you tick the box at sign-up or switch them on in Settings. Every
        announcement email identifies Tronites as the sender and includes an
        unsubscribe link (and a one-click unsubscribe option in supporting mail
        apps). Unsubscribing takes effect immediately.
      </p>
    </Section>

    <Section title="14. Cookies and browser storage">
      <p>
        We only use storage that is strictly necessary to run the app, so we do
        not show a cookie-consent banner. We do not use advertising, analytics or
        third-party tracking cookies, and we load our font from our own servers
        rather than a third party.
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <Strong>token</Strong> (cookie, 15 minutes) — keeps you signed in.
        </li>
        <li>
          <Strong>refreshToken</Strong> (cookie, up to 30 days) — renews your
          sign-in without asking for your password again; removed when you sign
          out.
        </li>
        <li>
          <Strong>theme</Strong> (local storage) — remembers light or dark mode.
        </li>
        <li>
          <Strong>otp:…</Strong> and <Strong>home-active-tab</Strong> (session
          storage, cleared when you close the tab) — keep a sign-up or
          password-reset step in progress and remember your open feed tab.
        </li>
        <li>
          <Strong>App cache</Strong> (service worker) — stores app files and
          some recent responses so the app loads faster and works offline.
        </li>
      </ul>
    </Section>

    <Section title="15. Changes to this policy">
      <p>
        We may update this policy as Tronites evolves. When we make a material
        change we will email you and/or show a notice in the app before it takes
        effect, update the "Last updated" date above and, where the law requires,
        ask for your consent again. Earlier versions are available on request.
      </p>
    </Section>

    <Section title="16. Contact us">
      <p>
        Questions about this policy or your data: <MailLink address={CONTACT.privacy} />.
        General support: <MailLink />. You can also complain to the Nigeria Data
        Protection Commission (ndpc.gov.ng).
      </p>
    </Section>
  </LegalPage>
);

export default PrivacyPolicy;
