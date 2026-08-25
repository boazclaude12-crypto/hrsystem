import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        muted: "var(--muted)",
        brand: {
          DEFAULT: "#2563eb",
          soft: "#eff6ff",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
