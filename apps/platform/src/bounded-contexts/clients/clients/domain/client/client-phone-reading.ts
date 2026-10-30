export type ClientPhoneReading =
  | { status: "empty" }
  | { status: "valid"; e164: string }
  | { status: "invalid" };
