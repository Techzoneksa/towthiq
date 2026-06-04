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
        maroon: {
          DEFAULT: "#973131",
          50: "#fdf2f2",
          100: "#fbe5e5",
          200: "#f8cccc",
          300: "#f2a3a3",
          400: "#e97070",
          500: "#dc4545",
          600: "#c92d2d",
          700: "#973131",
          800: "#7d2b2b",
          900: "#682828",
        },
        cream: {
          DEFAULT: "#dca47c",
          50: "#fdf8f3",
          100: "#faeee0",
          200: "#f4d9bf",
          300: "#edc09a",
          400: "#dca47c",
          500: "#d08a5e",
          600: "#c07347",
          700: "#a05d3a",
          800: "#824d33",
          900: "#6b412d",
        },
        taupe: {
          DEFAULT: "#917e69",
          50: "#f7f5f3",
          100: "#ede9e4",
          200: "#ddd4ca",
          300: "#c8b9a9",
          400: "#b09a85",
          500: "#917e69",
          600: "#846f5c",
          700: "#6e5b4c",
          800: "#5b4c41",
          900: "#4d4138",
        },
      },
      fontFamily: {
        arabic: ['"Tajawal"', '"Cairo"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
