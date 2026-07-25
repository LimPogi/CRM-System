export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B2733",
        paper: "#EEF1F0",
        teal: {
          DEFAULT: "#2C8C82",
          50: "#F0F8F6",
          100: "#D9EDEA",
          500: "#2C8C82",
          600: "#1F6359",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
