import { Helmet } from "react-helmet-async";

const SITE_NAME = "Tronites";
const DEFAULT_DESCRIPTION = "Connect, post, and chat in real time on Tronites.";
const DEFAULT_IMAGE = "/pwa-512.png";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://tronites.com";

/**
 * Drop-in per-page SEO head. Every public/noindex page should render this
 * once near the top of its tree. Pages that don't render it at all fall
 * back to whatever index.html has statically (generic "Tronites" title) —
 * so every route added to the public/noindex tables in the SEO plan needs
 * this, not just the "index, follow" ones.
 *
 * @param {string} title - Page title, WITHOUT the site name suffix (added here).
 * @param {string} [description] - Meta description, ~150-160 chars.
 * @param {string} [canonical] - Absolute or root-relative canonical path, e.g. "/u/adaokafor".
 * @param {"index, follow"|"noindex, nofollow"|"noindex, follow"} [robots="index, follow"]
 * @param {string} [image] - Absolute or root-relative OG/Twitter image.
 * @param {"website"|"profile"|"article"} [ogType="website"]
 * @param {object} [jsonLd] - Optional structured data object (already shaped, e.g. { "@context": "https://schema.org", "@type": "ProfilePage", ... }).
 */
const SeoHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  robots = "index, follow",
  image = DEFAULT_IMAGE,
  ogType = "website",
  jsonLd,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${SITE_URL}${canonical}`
    : undefined;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SeoHead;
