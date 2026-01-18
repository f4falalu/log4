import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",

      /**
       * BIKO MAP SYSTEM - ICON GOVERNANCE RULES
       *
       * These rules enforce strict icon governance to prevent:
       * - Direct icon imports from lucide-react
       * - Usage of deprecated Leaflet libraries
       *
       * All icons MUST be imported from @/map/icons/iconMap
       */
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message: "❌ Direct icon imports forbidden. Use iconMap from '@/map/icons/iconMap' instead. This ensures icon governance and prevents state encoding in icons.",
            },
            {
              name: "leaflet",
              message: "❌ Leaflet is deprecated. Use MapLibre via '@/map/core/MapEngine' instead. See migration plan for details.",
            },
            {
              name: "react-leaflet",
              message: "❌ react-leaflet is deprecated. Use react-map-gl with MapLibre instead. See migration plan for details.",
            },
            {
              name: "react-leaflet-cluster",
              message: "❌ react-leaflet-cluster is deprecated. MapLibre has built-in clustering via supercluster. See migration plan for details.",
            },
            {
              name: "leaflet-draw",
              message: "❌ leaflet-draw is deprecated. Use @maplibre/maplibre-gl-draw instead. See migration plan for details.",
            },
          ],
          patterns: [
            {
              group: ["**/mapIcons"],
              message: "❌ mapIcons.ts is deprecated (violates icon governance). Use iconMap from '@/map/icons/iconMap' instead.",
            },
          ],
        },
      ],
    },
  },
);
