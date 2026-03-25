import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Bebas Neue", "sans-serif"],
        hud: ["Share Tech Mono", "monospace"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        void: "var(--bg-void)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        overlay: "var(--bg-overlay)",
        primary: "var(--accent-primary)",
        secondary: "var(--accent-secondary)",
        bright: "var(--accent-bright)",
        cyan: "var(--accent-cyan)",
        blue: "var(--accent-blue)",
        danger: "var(--accent-red)",
        warning: "var(--accent-orange)",
        success: "var(--accent-green)",
      },
      boxShadow: {
        "glow-purple": "var(--glow-purple)",
        "glow-cyan": "var(--glow-cyan)",
        "glow-red": "var(--glow-red)",
      },
    },
  },
  plugins: [],
};

export default config;
