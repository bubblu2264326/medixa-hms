import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores MUST be in a standalone object (only `ignores`) to apply
  // repo-wide. Bundling `ignores` with other keys (e.g. `rules`) makes it
  // local to that config object, so build output was being linted.
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "docs/**",
      "next-env.d.ts",
      "db/seed/**",
      "database/snapshot/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Design-system guard: ban hardcoded Tailwind palette colors in classNames.
      // Use semantic tokens (bg-primary, text-muted-foreground, bg-success/danger/
      // warning/info, border-border, ...) per documentation/DESIGN_SYSTEM.md.
      // `warn` (not error) because some legacy areas (pharmacy purchase/settings,
      // dead POS payment/actions) aren't migrated yet — treat warnings as the
      // migration backlog; new code in migrated areas should stay clean.
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Use design tokens, not hardcoded Tailwind palette colors (see documentation/DESIGN_SYSTEM.md).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Use design tokens, not hardcoded Tailwind palette colors (see documentation/DESIGN_SYSTEM.md).",
        },
      ],
      "no-restricted-properties": [
        "warn",
        {
          object: "Date",
          property: "toLocaleString",
          message:
            "Use timezone helpers from src/lib/timezone/client.ts instead of Date.toLocaleString().",
        },
        {
          object: "Date",
          property: "toLocaleDateString",
          message:
            "Use timezone helpers from src/lib/timezone/client.ts instead of Date.toLocaleDateString().",
        },
        {
          object: "Date",
          property: "toLocaleTimeString",
          message:
            "Use timezone helpers from src/lib/timezone/client.ts instead of Date.toLocaleTimeString().",
        },
      ],
    },
  },
];

export default eslintConfig;
