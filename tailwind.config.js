/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#F5F7F6",
          100: "#E1F5EE",
          200: "#9FE1CB",
          400: "#1D9E75",
          600: "#0F6E56",
          800: "#085041",
          900: "#04342C",
        },
        surface: "#F5F7F6",
        ink: {
          DEFAULT: "#1E2624",
          sub: "#4E5955",
          muted: "#7A8580",
        },
        stroke: "#DFE6E3",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
