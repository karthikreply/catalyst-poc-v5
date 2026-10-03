import { describe, expect, it } from "vitest";

import { brands, contrastRatio, ensureReadable, resolveSkin, skinToCssVars, type BrandSkin } from "./brands";

const textPairs = (skin: ReturnType<typeof resolveSkin>) => [
  [skin.colors.onPrimary, skin.colors.primary],
  [skin.colors.onPrimaryContainer, skin.colors.primaryContainer],
  [skin.colors.onSurface, skin.colors.surface],
  [skin.colors.onSurfaceVariant, skin.colors.surfaceVariant],
  [skin.colors.onTopBar, skin.colors.topBar],
  [skin.colors.onNavActive, skin.colors.navActive],
] as const;

describe("partner skins", () => {
  it("keeps every text pair readable and leaves primary alone", () => {
    for (const brand of Object.values(brands)) {
      const resolved = ensureReadable(resolveSkin(brand));
      expect(resolved.colors.primary).toBe(brand.accent);
      for (const [foreground, background] of textPairs(resolved)) {
        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrastRatio(resolved.colors.focus, resolved.colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(resolved.colors.outline, resolved.colors.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it("repairs a hostile skin without changing its primary", () => {
    const hostile: BrandSkin = {
      colors: {
        primary: "#102030",
        onPrimary: "#102030",
        primaryContainer: "#102030",
        onPrimaryContainer: "#14283c",
        surface: "#101010",
        onSurface: "#1a1a1a",
        surfaceVariant: "#121212",
        onSurfaceVariant: "#222222",
        outline: "#202020",
        topBar: "#0c0c0c",
        onTopBar: "#161616",
        navActive: "#101010",
        onNavActive: "#1c1c1c",
        focus: "#181818",
      },
      type: { fontFamily: "Georgia, 'Times New Roman', serif", headingFamily: "Georgia, 'Times New Roman', serif", headingWeight: 700 },
      shape: { radiusSm: "0px", radiusMd: "0px", radiusLg: "0px", buttonRadius: "0px" },
      chrome: { topBar: "solid" },
    };
    const brand = { accent: "#102030", accentDark: "#102030", mark: "Hostile", skin: hostile };
    const repaired = ensureReadable(resolveSkin(brand));
    expect(repaired.colors.primary).toBe("#102030");
    expect(repaired.shape.buttonRadius).toBe("0px");
    expect(repaired.type.headingFamily).toContain("Georgia");
    expect(repaired.chrome.topBar).toBe("solid");
    for (const [foreground, background] of textPairs(repaired)) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(repaired.colors.focus, repaired.colors.surface)).toBeGreaterThanOrEqual(3);
    const vars = skinToCssVars(brand);
    expect(vars["--md-sys-color-primary"]).toBe("#102030");
    expect(vars["--md-sys-shape-full"]).toBe("0px");
    expect(vars["--brand-heading-font"]).toContain("Georgia");
  });
});
