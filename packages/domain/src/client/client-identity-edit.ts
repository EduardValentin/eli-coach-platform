import {
  MAX_VISITOR_NAME_LENGTH,
  VisitorBirthDate,
  type AgeMoment,
  type VisitorCountries,
  type VisitorGender,
  type VisitorPhoneEntry,
  type VisitorPhoneReading,
} from "../assessment-call";

import type { ClientIdentity } from "./client-identities";

export type ClientIdentityEditSnapshot = Omit<ClientIdentity, "email">;

export type EditableClientIdentity = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phone: VisitorPhoneEntry;
};

export type EnteredClientIdentity = EditableClientIdentity & {
  clientId: string;
  gender: VisitorGender;
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
    moment: AgeMoment,
    countries: VisitorCountries,
  ): ClientIdentityEditResult {
    const { phone: phoneEntry, ...identity } = entered;
    const phoneReading = countries.phoneOf(phoneEntry);
    const edit = new ClientIdentityEdit({
      ...identity,
      firstName: entered.firstName.trim(),
      lastName: entered.lastName.trim(),
      phone:
        phoneReading.status === "valid"
          ? phoneReading.phone.toSnapshot().e164
          : null,
    });
    const problems = edit.problems(moment, phoneReading, countries);

    return Object.keys(problems).length > 0
      ? { status: "invalid", problems }
      : { status: "valid", edit };
  }

  toSnapshot(): ClientIdentityEditSnapshot {
    return { ...this.snapshot };
  }

  private problems(
    moment: AgeMoment,
    phoneReading: VisitorPhoneReading,
    countries: VisitorCountries,
  ): ClientIdentityProblems {
    const { firstName, lastName, dateOfBirth, country } = this.snapshot;
    const firstNameProblem = this.nameProblem(firstName);
    const lastNameProblem = this.nameProblem(lastName);
    const birthDate = VisitorBirthDate.parse(dateOfBirth);
    const dateOfBirthProblem = birthDate
      ? birthDate.bookingProblemOn(moment)
      : "impossible";

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

    return name.length > MAX_VISITOR_NAME_LENGTH ? "too-long" : null;
  }
}
