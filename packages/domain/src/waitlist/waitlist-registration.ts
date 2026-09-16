export type ReducedPricingRegistrationDecision =
  | "already_registered"
  | "capacity_reached"
  | "register";

export function decideReducedPricingRegistration(input: {
  alreadyRegistered: boolean;
  cap: number;
  reducedPricingCount: number;
}): ReducedPricingRegistrationDecision {
  if (input.alreadyRegistered) {
    return "already_registered";
  }

  if (input.reducedPricingCount >= input.cap) {
    return "capacity_reached";
  }

  return "register";
}
