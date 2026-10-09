import { Link } from "react-router-dom";
import LegalPage, { Section, Strong, MailLink } from "../components/LegalPage";

const RefundPolicy = () => (
  <LegalPage
    title="Refunds & Cancellations"
    description="How refunds, cancellations and billing disputes work for Tronites badges, promotions, tips and creator subscriptions."
    canonical="/refunds"
  >
    <Section title="1. Overview">
      <p>
        All payments on Tronites are made in Nigerian naira (NGN) through
        Paystack. This page explains what you can cancel, what can be refunded,
        and how to ask. It forms part of our{" "}
        <Link to="/terms" className="text-primary-600 hover:underline">
          Terms of Use
        </Link>
        and does not reduce any rights you have under Nigerian consumer-protection
        law (including the Federal Competition and Consumer Protection Act).
      </p>
    </Section>

    <Section title="2. How to ask for a refund or report a billing problem">
      <p>
        Email <MailLink subject="Refund request" /> from the address on your
        account with your username, the Paystack payment reference, the date and
        amount, and what went wrong. We aim to reply within 5 business days. If a
        refund is approved it goes back to the original payment method through
        Paystack and usually reaches you within 5–10 business days, depending on
        your bank.
      </p>
    </Section>

    <Section title="3. What is and isn't refundable">
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <Strong>Charged in error.</Strong> Duplicate charges, charges for an
          amount different from the one shown, and charges you did not authorize
          are refunded in full once confirmed.
        </li>
        <li>
          <Strong>Verification (Business badge) fee.</Strong> A one-time fee for
          reviewing your application. It is not refundable once review has begun,
          except where we are unable to complete the review, you were charged in
          error, or we decide a refund is appropriate (for example, a denial
          caused by our mistake). A badge's renewal is a new purchase.
        </li>
        <li>
          <Strong>Promotions.</Strong> A promotion that has not yet started can be
          cancelled for a full refund. Once a promotion is running it is not
          refundable, except that if we cancel it or fail to deliver the placement
          you paid for, we refund the unused portion. Promotion never guarantees a
          particular number of views, clicks or engagements, so low performance on
          its own is not a ground for refund.
        </li>
        <li>
          <Strong>Tips.</Strong> Tips are voluntary gifts to a creator and are not
          refundable, other than charges made in error or without your
          authorization.
        </li>
        <li>
          <Strong>Creator subscriptions.</Strong> See section 4. Payments for a
          period already started are not refunded pro rata when you cancel.
        </li>
        <li>
          <Strong>Account removed or deleted by us.</Strong> If we remove a
          creator's account or content for a rule violation and you can no longer
          access what you subscribed for, contact us and we will refund the unused
          part of the current period.
        </li>
      </ul>
    </Section>

    <Section title="4. Subscriptions: billing, renewal and cancellation">
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <Strong>Billing.</Strong> The price and the 30-day period are shown
          before you pay. After your first payment, we automatically charge the
          payment method you authorized every 30 days until you cancel.
        </li>
        <li>
          <Strong>Cancel any time.</Strong> Open the creator's profile and cancel
          your subscription. Cancelling stops all future charges immediately, and
          you keep access until the end of the period you've already paid for.
          Cancelling before the renewal date means you are not charged again.
        </li>
        <li>
          <Strong>Failed renewals.</Strong> If a renewal charge fails, the
          subscription is marked as failed, access to subscriber-only content ends,
          and you and the creator are notified. You can subscribe again at any
          time.
        </li>
        <li>
          <Strong>Price changes.</Strong> We'll give you at least 30 days' notice
          before a price change applies to your subscription, and you can cancel
          before it does.
        </li>
        <li>
          <Strong>Deleting your account</Strong> cancels all subscriptions you
          hold or offer, and stops further charges.
        </li>
      </ul>
    </Section>

    <Section title="5. Creator payouts">
      <p>
        If a payout fails (for example because of incorrect bank details), the
        amount stays in your earnings balance and you can request it again once
        the details are corrected. Questions about a payout can be sent to{" "}
        <MailLink subject="Payout question" /> with the payout reference.
      </p>
    </Section>

    <Section title="6. Disputes with your bank">
      <p>
        Please contact us first — we can usually fix a problem faster than a
        card dispute can. If you dispute a valid charge with your bank, we may
        suspend the related features while it is investigated.
      </p>
    </Section>

    <Section title="7. Contact">
      <p>
        Billing and refund questions: <MailLink subject="Payment or billing question" />.
      </p>
    </Section>
  </LegalPage>
);

export default RefundPolicy;
