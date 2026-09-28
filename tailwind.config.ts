import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b7d0ff",
          300: "#8ab0ff",
          400: "#5c8bff",
          500: "#3366ff",
          600: "#264fdb",
          700: "#1d3db3",
          800: "#182f8a",
          900: "#152870",
        },
        status: {
          pending: "#94a3b8",
          progress: "#3366ff",
          completed: "#16a34a",
          overdue: "#dc2626",
          upcoming: "#d97706",
        },
        sync: {
          offline: "#94a3b8",
          online: "#0ea5e9",
          syncing: "#d97706",
          synced: "#16a34a",
          failed: "#dc2626",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
