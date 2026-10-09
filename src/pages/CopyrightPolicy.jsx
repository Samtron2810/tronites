import LegalPage, { Section, Strong, MailLink } from "../components/LegalPage";

const CopyrightPolicy = () => (
  <LegalPage
    title="Copyright & Takedowns"
    description="How to report content that infringes your copyright or trademark on Tronites, how to respond to a takedown, and how we handle repeat infringers."
    canonical="/copyright"
  >
    <Section title="1. Our approach">
      <p>
        Tronites respects intellectual-property rights and expects its users to
        do the same. Users own what they post, and confirm they have the right to
        share it. We respond to complete notices of alleged infringement by
        removing or disabling access to the content, and we act against accounts
        that repeatedly infringe.
      </p>
    </Section>

    <Section title="2. Reporting infringing content (takedown notice)">
      <p>
        Email <MailLink subject="Copyright notice" /> with the subject "Copyright
        notice" and include:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          Your name, address, email and phone number, and the name of the rights
          holder if you are acting for someone else.
        </li>
        <li>A description of the copyrighted work (or trademark) you say is infringed.</li>
        <li>
          The exact link (URL) to each post, comment, profile or message you want
          reviewed, so we can find it.
        </li>
        <li>
          A statement that you have a good-faith belief the use is not authorized
          by the rights holder, its agent or the law.
        </li>
        <li>
          A statement that the information in your notice is accurate and that you
          are the rights holder or authorized to act for them.
        </li>
        <li>Your signature (typed full name is fine).</li>
      </ul>
      <p>
        We will review the notice promptly. If it is complete and the claim looks
        valid, we remove or disable the content and tell the user who posted it.
        Notices that are incomplete may be returned for more information.{" "}
        <Strong>Please don't send a notice unless you are confident of your
        claim</Strong>: knowingly false claims can have legal consequences, and
        we may reject or act against abusive notices.
      </p>
      <p>
        If you are reporting something other than IP infringement (harassment,
        impersonation, privacy, illegal content), use the in-app Report option.
      </p>
    </Section>

    <Section title="3. If your content was removed (counter-notice)">
      <p>
        If you believe your content was removed by mistake or that you have the
        right to use it, email <MailLink subject="Copyright counter-notice" /> with
        the link to the removed content, your name and contact details, why you
        believe the removal was a mistake (for example you own the work, have
        permission, or the use is permitted by law), and a statement that your
        information is accurate. We will pass your reply to the person who
        complained and may restore the content unless they confirm they are taking
        the matter to a court or other competent authority.
      </p>
    </Section>

    <Section title="4. Repeat infringers">
      <p>
        An account that is the subject of repeated valid copyright notices will be
        warned, then suspended, and may be permanently banned. We may act sooner
        for deliberate or commercial-scale infringement.
      </p>
    </Section>

    <Section title="5. Trademarks and impersonation">
      <p>
        Using someone else's name, logo or brand in a way that is likely to
        mislead people — including impersonating Tronites staff — is not allowed.
        Report it using the process above or the in-app Report option.
      </p>
    </Section>

    <Section title="6. Court orders and legal requests">
      <p>
        We act on valid Nigerian court orders and lawful requests from competent
        authorities. Send them to <MailLink subject="Legal request" />.
      </p>
    </Section>
  </LegalPage>
);

export default CopyrightPolicy;
