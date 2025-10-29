import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable dark mode based on the 'dark' class on the HTML element
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        gold: '0 10px 15px -3px rgba(252, 211, 77, 0.5), 0 4px 6px -2px rgba(252, 211, 77, 0.2)',
        silver: '0 10px 15px -3px rgba(209, 213, 219, 0.5), 0 4px 6px -2px rgba(209, 213, 219, 0.2)',
        bronze: '0 10px 15px -3px rgba(217, 119, 6, 0.5), 0 4px 6px -2px rgba(217, 119, 6, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;






































