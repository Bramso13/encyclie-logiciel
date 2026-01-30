import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Masque tous les console.log, console.warn, console.error, etc.
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error"] } // Garde seulement console.error en production
        : false, // Garde tous les logs en développement
  },
};

export default nextConfig;
