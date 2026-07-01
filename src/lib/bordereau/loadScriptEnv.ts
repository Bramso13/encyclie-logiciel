import { loadEnvConfig } from "@next/env";

/** Charge .env comme Next.js (scripts tsx hors `next dev`). */
export function loadScriptEnv(): void {
  loadEnvConfig(process.cwd());
}
