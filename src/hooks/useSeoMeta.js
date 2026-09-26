const SITE_NAME = "Tronites";

/**
 * Organization JSON-LD for the homepage. Call once, pass result as
 * SeoHead's `jsonLd` prop.
 */
export const buildOrganizationJsonLd = ({ url, logoUrl }) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url,
  logo: logoUrl,
});

/**
 * ProfilePage JSON-LD for a public creator/user profile.
 * mainEntity switches between Person and Organization based on account type —
 * business accounts should pass accountType: "business".
 */
export const buildProfileJsonLd = ({ username, name, bio, imageUrl, url, accountType = "individual" }) => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": accountType === "business" ? "Organization" : "Person",
    name: name || username,
    alternateName: username,
    description: bio,
    image: imageUrl,
    url,
  },
});

/**
 * Truncate raw post text to a safe meta-description length without cutting
 * mid-word. Never pass unescaped HTML through here — this is plain text only.
 */
export const truncateForDescription = (text = "", maxLength = 155) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
};
