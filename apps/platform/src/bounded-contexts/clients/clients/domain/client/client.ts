import type {
  VisitorGender,
  VisitorPrimaryGoal,
} from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

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
  id: string;
  createdAt: Date;
};

export class Client {
  readonly id: string;
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
    this.id = props.id;
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

  static admitted(input: {
    id: string;
    intake: ClientIntake;
    at: Date;
  }): Client {
    return new Client({ ...input.intake, id: input.id, createdAt: input.at });
  }

  toSnapshot(): ClientSnapshot {
    return {
      id: this.id,
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
