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

    const localPart = this.value.slice(0, domainIndex);
    const tagIndex = localPart.indexOf("+");

    return tagIndex < 0
      ? this.value
      : `${localPart.slice(0, tagIndex)}${this.value.slice(domainIndex)}`;
  }
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}
