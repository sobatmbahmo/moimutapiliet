/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#25D366', // Warna Hijau WA
        tiktok: '#000000',  // Warna Hitam TikTok
      }
    },
  },
  plugins: [],
}
