import { Link } from "react-router-dom";
import LegalPage, { Section, Strong, MailLink } from "../components/LegalPage";
import { MIN_SIGNUP_AGE } from "../constants/legal";

const CommunityGuidelines = () => (
  <LegalPage
    title="Community Guidelines"
    description="What is and isn't allowed on Tronites, how to report content, and how we enforce the rules."
    canonical="/guidelines"
  >
    <Section title="1. The idea">
      <p>
        Tronites is for conversation, community and creativity, and it is open to
        people aged {MIN_SIGNUP_AGE} and over. These guidelines explain what we
        expect so everyone can feel safe. They are part of our{" "}
        <Link to="/terms" className="text-primary-600 hover:underline">
          Terms of Use
        </Link>
        .
      </p>
    </Section>

    <Section title="2. What isn't allowed">
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <Strong>Child safety.</Strong> Any sexual or exploitative content
          involving a minor, grooming, or anything that puts a child at risk.
          We remove it, ban the account and report it to the authorities.
        </li>
        <li>
          <Strong>Threats and violence.</Strong> Threatening, inciting or praising
          violence or terrorism, or encouraging self-harm.
        </li>
        <li>
          <Strong>Harassment and hate.</Strong> Targeted abuse, bullying, stalking,
          and attacks on people because of who they are (for example ethnicity,
          religion, gender, disability or sexual orientation).
        </li>
        <li>
          <Strong>Sexually explicit content.</Strong> Pornography or graphic sexual
          material.
        </li>
        <li>
          <Strong>Illegal activity.</Strong> Selling or promoting illegal goods or
          services, and anything else unlawful in Nigeria.
        </li>
        <li>
          <Strong>Scams and misleading behaviour.</Strong> Fraud, phishing,
          impersonation, fake verification claims, and misleading promotions.
        </li>
        <li>
          <Strong>Spam and manipulation.</Strong> Repeated or copy-pasted posts,
          bulk unsolicited messages, fake engagement, and running coordinated or
          multiple accounts to do any of this or to dodge a restriction.
        </li>
        <li>
          <Strong>Privacy violations.</Strong> Sharing someone's private
          information (address, phone number, ID, private messages or images)
          without permission.
        </li>
        <li>
          <Strong>Intellectual-property infringement.</Strong> See{" "}
          <Link to="/copyright" className="text-primary-600 hover:underline">
            Copyright &amp; Takedowns
          </Link>
          .
        </li>
        <li>
          <Strong>Harming the platform.</Strong> Malware, scraping, or trying to
          bypass limits and security controls.
        </li>
      </ul>
    </Section>

    <Section title="3. Promoted content">
      <p>
        Paid promotions are labelled "Sponsored" and must follow the same rules as
        every other post. Promoted content that is misleading, unlawful or
        harmful will be cancelled.
      </p>
    </Section>

    <Section title="4. How to report">
      <p>
        Use the Report option on any post, comment, message or profile. Reports
        are reviewed by our moderation team and are not shown to the person you
        reported. You can also block or mute any account at any time. For
        urgent child-safety concerns, report in the app and email{" "}
        <MailLink subject="Urgent safety report" />. If someone is in immediate
        danger, contact your local emergency services first.
      </p>
    </Section>

    <Section title="5. How we enforce the rules">
      <p>
        Some content is screened automatically and flagged for a person to review;
        flags alone never remove content. Depending on how serious a violation is,
        we may:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>remove the content;</li>
        <li>give a warning (a "strike");</li>
        <li>reduce how widely an account's posts are recommended;</li>
        <li>
          suspend the account — automatically for 7 days at 3 strikes — or ban it
          permanently, automatically at 5 strikes;
        </li>
        <li>
          act immediately, without earlier warnings, for serious violations such
          as child-safety offences, credible threats or fraud;
        </li>
        <li>refer serious matters to the authorities.</li>
      </ul>
    </Section>

    <Section title="6. Appeals">
      <p>
        If your account is suspended or banned, submit an appeal from the sign-in
        screen; a person reviews it and may reverse the decision. If a single post
        or comment was removed, email <MailLink subject="Content review" /> and
        tell us which one — we will look at it again.
      </p>
    </Section>

    <Section title="7. Law enforcement and legal requests">
      <p>
        We cooperate with valid court orders and lawful requests from competent
        authorities. See the{" "}
        <Link to="/terms" className="text-primary-600 hover:underline">
          Terms of Use
        </Link>{" "}
        for how to send them.
      </p>
    </Section>
  </LegalPage>
);

export default CommunityGuidelines;
