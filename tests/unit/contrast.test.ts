import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRAST_PAIRS,
  contrastRatio,
  DARK,
  LIGHT,
  type Palette,
} from "../../lib/tokens";

/**
 * WCAG AA gate on the design system. Every pair in CONTRAST_PAIRS is checked
 * in BOTH modes: 4.5:1 for normal text, 3:1 for large text. A violation fails
 * the build — that is the point. Adding a new foreground/background
 * combination to a screen means adding the pair to lib/tokens.ts.
 */

const MODES: [string, Palette][] = [
  ["light", LIGHT],
  ["dark", DARK],
];

for (const [mode, palette] of MODES) {
  for (const pair of CONTRAST_PAIRS) {
    const min = pair.large ? 3 : 4.5;
    test(`contrast ${mode}: ${pair.name} ≥ ${min}:1`, () => {
      const fg = mode === "dark" && pair.fgDark ? pair.fgDark : pair.fg;
      const ratio = contrastRatio(palette[fg], palette[pair.bg]);
      assert.ok(
        ratio >= min,
        `${mode} ${pair.name}: ${ratio.toFixed(2)}:1 (needs ${min}:1) — ${palette[fg]} on ${palette[pair.bg]}`,
      );
    });
  }
}

test("both palettes define every token", () => {
  const keys = Object.keys(LIGHT) as (keyof Palette)[];
  for (const k of keys) {
    assert.ok(LIGHT[k], `light missing ${k}`);
    assert.ok(DARK[k], `dark missing ${k}`);
  }
  assert.equal(keys.length, Object.keys(DARK).length);
});
