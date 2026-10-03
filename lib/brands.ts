export type BrandId = "cdw" | "softwareone" | "softchoice";

/**
 * Everything the partner and customer chrome takes from the brand: colour, type, shape, logo.
 * The shell writes these to the Material tokens, so header, rail, breadcrumb, links, chips,
 * buttons, focus ring and the step rail all follow. The PDM chrome never reads a skin.
 */
export type Skin = {
  primary: string;
  primaryDark: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  outline: string;
  outlineVariant: string;
  font: string;
  shape: { small: string; medium: string; large: string; full: string };
  logo: { text: string; weight: number; letterSpacing: string };
};

export type Brand = {
  id: BrandId;
  partnerName: string;
  productName: string;
  mark: string;
  /** Alias of skin.primary, kept for the session pages. */
  accent: string;
  /** Alias of skin.primaryDark. */
  accentDark: string;
  skin: Skin;
  emailIntro: string;
  artifactIntro: string;
  artifactClosing: string;
  signoff: string;
};

export function withBrandPeople(brand: Brand) {
  return {
    facilitatorOrg: brand.partnerName,
    sponsorLine: `Tom Brennan · ${brand.partnerName} AI & Data Practice Lead`,
    signoff: `Ravi Menon · ${brand.partnerName}`,
  };
}

/** CSS custom properties for one skin. Spread onto the shell root as inline style. */
export function skinVars(skin: Skin): Record<string, string> {
  return {
    "--md-sys-color-primary": skin.primary,
    "--md-sys-color-on-primary": skin.onPrimary,
    "--md-sys-color-primary-container": skin.primaryContainer,
    "--md-sys-color-on-primary-container": skin.onPrimaryContainer,
    "--md-sys-color-surface": skin.surface,
    "--md-sys-color-surface-container": skin.surfaceContainer,
    "--md-sys-color-surface-container-high": skin.surfaceContainerHigh,
    "--md-sys-color-outline": skin.outline,
    "--md-sys-color-outline-variant": skin.outlineVariant,
    "--md-sys-shape-small": skin.shape.small,
    "--md-sys-shape-medium": skin.shape.medium,
    "--md-sys-shape-large": skin.shape.large,
    "--md-sys-shape-full": skin.shape.full,
    "--md-sys-font": skin.font,
    "--brand-accent": skin.primary,
    "--brand-accent-dark": skin.primaryDark,
  };
}

const cdwSkin: Skin = {
  primary: "#cc1827",
  primaryDark: "#a70f1c",
  onPrimary: "#ffffff",
  primaryContainer: "#fde3e5",
  onPrimaryContainer: "#5c0710",
  surface: "#fcfcfc",
  surfaceContainer: "#f1f1f1",
  surfaceContainerHigh: "#e7e7e7",
  outline: "#8b8b8b",
  outlineVariant: "#d8d8d8",
  font: "Arial, Helvetica, sans-serif",
  shape: { small: "2px", medium: "4px", large: "6px", full: "4px" },
  logo: { text: "CDW", weight: 900, letterSpacing: "-0.08em" },
};

const softwareoneSkin: Skin = {
  primary: "#c84318",
  primaryDark: "#a5340f",
  onPrimary: "#ffffff",
  primaryContainer: "#fde4da",
  onPrimaryContainer: "#5a1c07",
  surface: "#fffaf7",
  surfaceContainer: "#f7ece6",
  surfaceContainerHigh: "#efe0d8",
  outline: "#8c7f78",
  outlineVariant: "#dccfc8",
  font: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
  shape: { small: "8px", medium: "12px", large: "16px", full: "9999px" },
  logo: { text: "softwareone", weight: 800, letterSpacing: "-0.06em" },
};

const softchoiceSkin: Skin = {
  primary: "#6f2cff",
  primaryDark: "#5420c7",
  onPrimary: "#ffffff",
  primaryContainer: "#e9deff",
  onPrimaryContainer: "#2a0a73",
  surface: "#faf8ff",
  surfaceContainer: "#f0ebfa",
  surfaceContainerHigh: "#e7e0f5",
  outline: "#837c91",
  outlineVariant: "#d2cadf",
  font: '"Segoe UI", Roboto, Arial, sans-serif',
  shape: { small: "6px", medium: "10px", large: "14px", full: "9999px" },
  logo: { text: "softchoice", weight: 800, letterSpacing: "-0.05em" },
};

export const brands: Record<BrandId, Brand> = {
  cdw: {
    id: "cdw",
    partnerName: "CDW",
    productName: "Value session",
    mark: "CDW",
    accent: cdwSkin.primary,
    accentDark: cdwSkin.primaryDark,
    skin: cdwSkin,
    emailIntro: "We’ll keep the session practical and grounded in Heartland’s operating reality.",
    artifactIntro: "Prepared by CDW with Heartland Mutual Insurance",
    artifactClosing: "CDW will carry the evidence into the hackathon booking and keep Heartland’s operating team in control of the next step.",
    signoff: "Ravi Menon · CDW",
  },
  softwareone: {
    id: "softwareone",
    partnerName: "SoftwareOne",
    productName: "Value session",
    mark: "softwareone",
    accent: softwareoneSkin.primary,
    accentDark: softwareoneSkin.primaryDark,
    skin: softwareoneSkin,
    emailIntro: "Together, we’ll turn Heartland’s operational friction into a focused, measurable pilot.",
    artifactIntro: "A SoftwareOne Value Lab brief for Heartland Mutual Insurance",
    artifactClosing: "SoftwareOne will turn this evidence into a dated hackathon while Heartland retains ownership of the operating decision.",
    signoff: "Ravi Menon · SoftwareOne",
  },
  softchoice: {
    id: "softchoice",
    partnerName: "Softchoice",
    productName: "Value session",
    mark: "softchoice",
    accent: softchoiceSkin.primary,
    accentDark: softchoiceSkin.primaryDark,
    skin: softchoiceSkin,
    emailIntro: "We’ll make the case practical, measurable, and ready for a customer-owned pilot decision.",
    artifactIntro: "A Softchoice business case prepared with Heartland Mutual Insurance",
    artifactClosing: "Softchoice will help Heartland validate the evidence in a three-day hackathon before either team treats the estimate as proved value.",
    signoff: "Ravi Menon · Softchoice",
  },
};
