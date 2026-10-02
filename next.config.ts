import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/** Commit corto del build: GIT_SHA (Docker/CI) o, en local, el HEAD de git. */
function gitShortSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    GIT_SHA: gitShortSha(),
  },
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
