import { joinBasePath } from "@eli-coach-platform/config";
import { useQuery } from "@tanstack/react-query";

import {
  isBotDetectionConfig,
  type BotDetectionConfig,
} from "./bot-detection-contract";

export const BOT_DETECTION_API_URL = joinBasePath(
  import.meta.env.BASE_URL,
  "/api/bot-detection",
);
export const BOT_DETECTION_QUERY_KEY = [
  "public",
  "bot-detection",
] as const;

export function useBotDetectionConfigQuery() {
  return useQuery({
    queryFn: ({ signal }) => fetchBotDetectionConfig(signal),
    queryKey: BOT_DETECTION_QUERY_KEY,
    staleTime: Infinity,
  });
}

export async function fetchBotDetectionConfig(
  signal: AbortSignal,
): Promise<BotDetectionConfig> {
  const response = await fetch(BOT_DETECTION_API_URL, {
    headers: { Accept: "application/json" },
    signal,
  });
  const config = await readJsonSafely(response);

  if (!response.ok || !isBotDetectionConfig(config)) {
    throw new Error("Bot detection configuration is unavailable.");
  }

  return config;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
