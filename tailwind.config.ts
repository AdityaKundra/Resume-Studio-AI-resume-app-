import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        label: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        ca: "1rem",
        "ca-xl": "1.5rem",
      },
      colors: {
        ca: {
          surface: "#fcf9f8",
          low: "#f5f2f0",
          container: "#ebe8e5",
          lowest: "#ffffff",
          dim: "#e0dcd8",
          highest: "#e8e4e0",
          ink: "#323232",
          muted: "#6b6560",
          primary: "#0054d6",
          "primary-dim": "#004abd",
          "primary-soft": "#e8f0ff",
          "primary-ink": "#003087",
          "on-primary": "#ffffff",
          danger: "#c41e3a",
          "danger-soft": "#fef1f3",
          warning: "#b45309",
          "warning-soft": "#fff7e8",
          success: "#047857",
          "success-soft": "#ecfdf5",
        },
      },
      backgroundImage: {
        "ca-primary-gradient":
          "linear-gradient(135deg, #0054d6 0%, #004abd 100%)",
      },
      boxShadow: {
        ca: "0 1px 2px rgb(50 50 50 / 0.04)",
        "ca-ambient": "0 12px 32px rgb(50 50 50 / 0.06)",
        "ca-paper": "0 12px 40px rgb(50 50 50 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
