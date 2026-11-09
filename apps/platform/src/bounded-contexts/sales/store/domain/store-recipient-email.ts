import type { EmailAcceptancePort } from "./email-acceptance-port";

const SUBADDRESS_SEPARATOR = "+";

export type StoreRecipientEmailSnapshot = {
  address: string;
};

export class StoreRecipientEmail {
  readonly address: string;

  private constructor(snapshot: StoreRecipientEmailSnapshot) {
    this.address = snapshot.address;
  }

  static normalized(
    rawAddress: string,
    emailAcceptancePort: Pick<EmailAcceptancePort, "normalize">,
  ): StoreRecipientEmail {
    return new StoreRecipientEmail({
      address: emailAcceptancePort.normalize(rawAddress),
    });
  }

  static reconstitute(
    snapshot: StoreRecipientEmailSnapshot,
  ): StoreRecipientEmail {
    return new StoreRecipientEmail(snapshot);
  }

  deliveryLimitKey(): string {
    const domainIndex = this.address.lastIndexOf("@");

    if (domainIndex < 0) {
      return this.address;
    }

    const localPart = this.address.slice(0, domainIndex);
    const tagIndex = localPart.indexOf(SUBADDRESS_SEPARATOR);

    return tagIndex < 0
      ? this.address
      : `${localPart.slice(0, tagIndex)}${this.address.slice(domainIndex)}`;
  }

  toSnapshot(): StoreRecipientEmailSnapshot {
    return { address: this.address };
  }
}
