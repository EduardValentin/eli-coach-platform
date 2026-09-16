export type StoreDeliveryLimitWindow = "cooldown" | "daily";

export type DeliveryLimitPolicy = {
  cooldownMs: number;
  dailyLimit: number;
  dailyWindowMs: number;
  grantDurationMs: number;
};

export const STORE_DELIVERY_LIMIT_POLICY: DeliveryLimitPolicy = {
  cooldownMs: 60 * 1000,
  dailyLimit: 10,
  dailyWindowMs: 24 * 60 * 60 * 1000,
  grantDurationMs: 7 * 24 * 60 * 60 * 1000,
};

export type DeliveryWindows = {
  cooldownSince: Date;
  dailyWindowSince: Date;
  expiresAt: Date;
};

export function resolveDeliveryWindows(
  requestedAt: Date,
  policy: DeliveryLimitPolicy,
): DeliveryWindows {
  const time = requestedAt.getTime();
  return {
    cooldownSince: new Date(time - policy.cooldownMs),
    dailyWindowSince: new Date(time - policy.dailyWindowMs),
    expiresAt: new Date(time + policy.grantDurationMs),
  };
}

export type DeliveryUsage = {
  cooldownCount: number;
  dailyCount: number;
};

export function evaluateDeliveryLimit(
  usage: DeliveryUsage,
  dailyLimit: number,
): StoreDeliveryLimitWindow | null {
  if (usage.cooldownCount > 0) {
    return "cooldown";
  }
  return usage.dailyCount >= dailyLimit ? "daily" : null;
}
