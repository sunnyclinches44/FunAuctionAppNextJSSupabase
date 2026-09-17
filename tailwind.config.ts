import type { Config } from 'tailwindcss'

/**
 * Colours are CSS variables defined in src/app/globals.css so the light (paper)
 * and dark (navy) SSM One themes swap without Tailwind emitting two class sets.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ivory: "var(--ivory)",
        cloud: "var(--cloud)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        hairline: "var(--hairline)",
        live: "var(--live)",
        "live-bg": "var(--live-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      boxShadow: {
        card: "0 1px 2px var(--shadow-1), 0 8px 24px var(--shadow-2)",
        lift: "0 2px 4px var(--shadow-1), 0 18px 44px var(--shadow-2)",
      },
    },
  },
  plugins: [],
}
export default config
