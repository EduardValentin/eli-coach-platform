import type { VisitorGender, VisitorPrimaryGoal } from "../assessment-call";

export type ClientIntake = {
  assessmentCallId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
  bookingTimeZone: string;
};

export type ClientSnapshot = ClientIntake & {
  createdAt: Date;
};

export class Client {
  readonly assessmentCallId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly dateOfBirth: string;
  readonly gender: VisitorGender;
  readonly primaryGoal: VisitorPrimaryGoal;
  readonly country: string;
  readonly phone: string | null;
  readonly bookingTimeZone: string;
  readonly createdAt: Date;

  private constructor(props: ClientSnapshot) {
    this.assessmentCallId = props.assessmentCallId;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.dateOfBirth = props.dateOfBirth;
    this.gender = props.gender;
    this.primaryGoal = props.primaryGoal;
    this.country = props.country;
    this.phone = props.phone;
    this.bookingTimeZone = props.bookingTimeZone;
    this.createdAt = props.createdAt;
  }

  static fromIntake(intake: ClientIntake, now: Date): Client {
    return new Client({ ...intake, createdAt: now });
  }

  toSnapshot(): ClientSnapshot {
    return {
      assessmentCallId: this.assessmentCallId,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      dateOfBirth: this.dateOfBirth,
      gender: this.gender,
      primaryGoal: this.primaryGoal,
      country: this.country,
      phone: this.phone,
      bookingTimeZone: this.bookingTimeZone,
      createdAt: this.createdAt,
    };
  }
}
