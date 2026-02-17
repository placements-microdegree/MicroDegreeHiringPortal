/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",
        primaryDark: "#1E40AF",
        bgLight: "#F8FAFC",
      },
    },
  },
  plugins: [],
};
