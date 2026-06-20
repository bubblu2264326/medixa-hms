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
      "next-env.d.ts",
      "db/seed/**",
      "database/snapshot/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
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
