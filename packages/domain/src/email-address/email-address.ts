import type { EmailSubaddressPolicy } from "./email-subaddress-policy";

const SUBADDRESS_SEPARATOR = "+";

export class EmailAddress {
  private constructor(readonly value: string) {}

  static normalize(raw: string): EmailAddress {
    return new EmailAddress(normalize(raw));
  }

  get deliveryLimitKey(): string {
    const domainIndex = this.value.lastIndexOf("@");

    if (domainIndex < 0) {
      return this.value;
    }

    const tagIndex = this.localPart.indexOf(SUBADDRESS_SEPARATOR);

    return tagIndex < 0
      ? this.value
      : `${this.localPart.slice(0, tagIndex)}${this.value.slice(domainIndex)}`;
  }

  hasSubaddress(): boolean {
    return this.localPart.includes(SUBADDRESS_SEPARATOR);
  }

  isAcceptedBy(policy: EmailSubaddressPolicy): boolean {
    return policy === "allowed" || !this.hasSubaddress();
  }

  private get localPart(): string {
    const domainIndex = this.value.lastIndexOf("@");

    return domainIndex < 0 ? this.value : this.value.slice(0, domainIndex);
  }
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}
