import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/useAuth";
import SeoHead from "./SeoHead";
import {
  CONTACT,
  LEGAL_ENTITY,
  LEGAL_LAST_UPDATED,
  LEGAL_LINKS,
} from "../constants/legal";

export const Section = ({ title, children }) => (
  <section className="bg-card border border-stroke rounded-2xl p-5 mb-4">
    <h2 className="text-base font-semibold text-ink mb-2">{title}</h2>
    <div className="text-base text-ink-muted leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

export const Strong = ({ children }) => (
  <strong className="text-ink">{children}</strong>
);

export const MailLink = ({ address = CONTACT.support, subject }) => (
  <a
    href={`mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`}
    className="text-primary-600 font-medium hover:underline"
  >
    {address}
  </a>
);

// "Tronites is operated by X (registration no. Y), Z." — built only from the
// fields filled in constants/legal.js, so an unfilled entity renders nothing.
export const EntityLine = () => {
  const { name, registrationNumber, address, dataProtectionOfficer } =
    LEGAL_ENTITY;
  if (!name && !address) return null;
  return (
    <p>
      Tronites is operated by {name || "the Tronites operator"}
      {registrationNumber ? ` (registration no. ${registrationNumber})` : ""}
      {address ? `, ${address}` : ""}.
      {dataProtectionOfficer
        ? ` Our data protection contact is ${dataProtectionOfficer}.`
        : ""}
    </p>
  );
};

// Shared shell for every legal page: back button, SEO tags, title, version
// date, cross-links to the other legal pages, sign-in prompt when logged out.
const LegalPage = ({ title, description, canonical, children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Reached both from in-app links (real history to pop back to) and
  // directly from Login/Register/the footer while logged out (opened fresh
  // or in a new tab — no useful history). A history length of 1 means
  // "back" would leave the app entirely, so route home explicitly instead.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user ? "/home" : "/");
    }
  };

  return (
    <MainLayout>
      <SeoHead title={title} description={description} canonical={canonical} />
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">{title}</h1>
      <p className="text-base text-ink-muted mb-6">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>

      {children}

      <nav
        aria-label="Legal pages"
        className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted"
      >
        {LEGAL_LINKS.filter((l) => l.to !== canonical).map((l) => (
          <Link key={l.to} to={l.to} className="hover:text-ink hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>

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

export default LegalPage;
