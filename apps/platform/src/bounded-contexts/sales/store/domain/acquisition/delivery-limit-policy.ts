export type StoreDeliveryLimitWindow = "cooldown" | "daily";

type DeliveryLimitPolicySnapshot = {
  cooldownMs: number;
  dailyLimit: number;
  dailyWindowMs: number;
  grantDurationMs: number;
};

export type DeliveryWindows = {
  cooldownSince: Date;
  dailyWindowSince: Date;
  expiresAt: Date;
};

export type DeliveryUsage = {
  cooldownCount: number;
  dailyCount: number;
};

export class DeliveryLimitPolicy {
  readonly cooldownMs: number;
  readonly dailyLimit: number;
  readonly dailyWindowMs: number;
  readonly grantDurationMs: number;

  private constructor(snapshot: DeliveryLimitPolicySnapshot) {
    this.cooldownMs = snapshot.cooldownMs;
    this.dailyLimit = snapshot.dailyLimit;
    this.dailyWindowMs = snapshot.dailyWindowMs;
    this.grantDurationMs = snapshot.grantDurationMs;
  }

  static of(snapshot: DeliveryLimitPolicySnapshot): DeliveryLimitPolicy {
    return new DeliveryLimitPolicy(snapshot);
  }

  windowsAt(at: Date): DeliveryWindows {
    const time = at.getTime();

    return {
      cooldownSince: new Date(time - this.cooldownMs),
      dailyWindowSince: new Date(time - this.dailyWindowMs),
      expiresAt: new Date(time + this.grantDurationMs),
    };
  }

  limitedWindow(usage: DeliveryUsage): StoreDeliveryLimitWindow | null {
    if (usage.cooldownCount > 0) {
      return "cooldown";
    }

    return usage.dailyCount >= this.dailyLimit ? "daily" : null;
  }

  toSnapshot(): DeliveryLimitPolicySnapshot {
    return {
      cooldownMs: this.cooldownMs,
      dailyLimit: this.dailyLimit,
      dailyWindowMs: this.dailyWindowMs,
      grantDurationMs: this.grantDurationMs,
    };
  }
}

export const STORE_DELIVERY_LIMIT_POLICY = DeliveryLimitPolicy.of({
  cooldownMs: 60 * 1000,
  dailyLimit: 10,
  dailyWindowMs: 24 * 60 * 60 * 1000,
  grantDurationMs: 7 * 24 * 60 * 60 * 1000,
});
