import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Files with encoding or other issues:
    "merge_temp_bids.js",
  ]),
  {
    rules: {
      // This rule targets the Pages Router (pages/_document.js) and fires
      // incorrectly in App Router projects. app/layout.js IS the correct
      // place to load global fonts in the App Router.
      "@next/next/no-page-custom-font": "off",
    },
  },
]);

export default eslintConfig;
