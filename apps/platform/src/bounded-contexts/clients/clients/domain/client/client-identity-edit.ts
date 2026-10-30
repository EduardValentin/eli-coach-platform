import {
  MAX_CLIENT_NAME_LENGTH,
  type ClientCountries,
  type ClientGender,
  type ClientPhoneEntry,
  type ClientToday,
} from "./client-details";
import { type ClientPhoneReading } from "./client-phone-reading";
import type { ClientIdentity } from "./client-identities-port";

export type ClientIdentityEditSnapshot = Omit<ClientIdentity, "email">;

export type EditableClientIdentity = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phone: ClientPhoneEntry;
};

export type EnteredClientIdentity = EditableClientIdentity & {
  clientId: string;
  gender: ClientGender;
};

export type ClientIdentityProblems = {
  firstName?: "missing" | "too-long";
  lastName?: "missing" | "too-long";
  phone?: "invalid";
  dateOfBirth?: "impossible" | "too-young";
  country?: "invalid";
};

export type ClientIdentityEditResult =
  | { status: "valid"; edit: ClientIdentityEdit }
  | { status: "invalid"; problems: ClientIdentityProblems };

export class ClientIdentityEdit {
  private constructor(private readonly snapshot: ClientIdentityEditSnapshot) {}

  static of(
    entered: EnteredClientIdentity,
    today: ClientToday,
    countries: ClientCountries,
  ): ClientIdentityEditResult {
    const { phone: phoneEntry, ...identity } = entered;
    const phoneReading = countries.phoneOf(phoneEntry);
    const edit = new ClientIdentityEdit({
      ...identity,
      firstName: entered.firstName.trim(),
      lastName: entered.lastName.trim(),
      phone: phoneReading.status === "valid" ? phoneReading.e164 : null,
    });
    const problems = edit.problems(today, phoneReading, countries);

    return Object.keys(problems).length > 0
      ? { status: "invalid", problems }
      : { status: "valid", edit };
  }

  toSnapshot(): ClientIdentityEditSnapshot {
    return { ...this.snapshot };
  }

  private problems(
    today: ClientToday,
    phoneReading: ClientPhoneReading,
    countries: ClientCountries,
  ): ClientIdentityProblems {
    const { firstName, lastName, dateOfBirth, country } = this.snapshot;
    const firstNameProblem = this.nameProblem(firstName);
    const lastNameProblem = this.nameProblem(lastName);
    const dateOfBirthProblem = today.birthDateProblemOf(dateOfBirth);

    return {
      ...(firstNameProblem && { firstName: firstNameProblem }),
      ...(lastNameProblem && { lastName: lastNameProblem }),
      ...(phoneReading.status === "invalid" && { phone: "invalid" }),
      ...(dateOfBirthProblem && { dateOfBirth: dateOfBirthProblem }),
      ...(!countries.includes(country) && { country: "invalid" }),
    };
  }

  private nameProblem(name: string): "missing" | "too-long" | null {
    if (name.length === 0) return "missing";

    return name.length > MAX_CLIENT_NAME_LENGTH ? "too-long" : null;
  }
}
