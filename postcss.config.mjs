import tailwind from "@tailwindcss/postcss";
import darkFallback from "./build/dark-fallback-postcss.mjs";

const config = {
  plugins: [tailwind(), darkFallback()],
};

export default config;
