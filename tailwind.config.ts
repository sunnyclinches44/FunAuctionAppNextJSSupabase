import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        neon: "0 0 0 2px rgba(255,193,7,.25), 0 10px 26px rgba(255,193,7,.35), inset 0 -2px 6px rgba(0,0,0,.25)",
        neonHover: "0 0 0 3px rgba(255,193,7,.35), 0 14px 36px rgba(255,193,7,.45), inset 0 -2px 8px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [],
}
export default config
