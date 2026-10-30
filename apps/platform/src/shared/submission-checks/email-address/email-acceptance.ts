import { EmailAddress } from "./email-address";
import type { EmailSubaddressPolicy } from "./email-subaddress-policy";

export function createEmailAcceptance(policy: EmailSubaddressPolicy): {
  normalize(raw: string): string;
  accepts(email: string): boolean;
} {
  return {
    normalize: (raw) => EmailAddress.normalize(raw).value,
    accepts: (email) => EmailAddress.normalize(email).isAcceptedBy(policy),
  };
}
