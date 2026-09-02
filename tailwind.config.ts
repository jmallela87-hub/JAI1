import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08080A",
        surface: "#121214",
        "surface-hover": "#1B1B1F",
        "surface-raised": "#1A1A1E",
        border: "#232327",
        "border-soft": "#1D1D21",
        text: "#F2F2F4",
        "text-muted": "#9A9AA3",
        "text-faint": "#6B6B73",
        accent: "#6C5CE7",
        "accent-2": "#4F46E5",
        danger: "#EF4444",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #8B7CF6 0%, #4F46E5 100%)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
