import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Paleta da marca: teal (Plastic Bank) + dourado (leão)
        marca: {
          teal: "#119DB1",
          "teal-dark": "#0C7E8F",
          "teal-light": "#E6F6F8",
          navy: "#0C2436",
          gold: "#C8911C",
          "gold-light": "#F6EAD0",
          green: "#3FA535",
          "green-dark": "#347F2C",
        },
      },
    },
  },
  plugins: [],
};
export default config;
