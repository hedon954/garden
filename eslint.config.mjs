import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["tests/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".garden/**",
    // Local ignored historical experiment checkouts are not project source.
    "work/**",
    "templates/**",
    // Bundled output of the editor preview and plugins.
    "ui/preview/dist/**",
    "editors/*/dist/**",
    "editors/dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
