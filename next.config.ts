import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Azure Speech SDK uses Node APIs (ws, https agents); load it with native require instead of bundling.
  serverExternalPackages: ["microsoft-cognitiveservices-speech-sdk"],
};

export default nextConfig;
