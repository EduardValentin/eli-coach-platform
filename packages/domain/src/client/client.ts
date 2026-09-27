import type {
  AssessmentCallSnapshot,
  VisitorGender,
  VisitorPrimaryGoal,
} from "../assessment-call";

export type ClientSnapshot = {
  assessmentCallId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: VisitorGender;
  primaryGoal: VisitorPrimaryGoal;
  country: string;
  phone: string | null;
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
    this.createdAt = props.createdAt;
  }

  static fromAssessmentCall(call: AssessmentCallSnapshot, now: Date): Client {
    return new Client({
      assessmentCallId: call.id,
      firstName: call.firstName,
      lastName: call.lastName,
      email: call.visitorEmail,
      dateOfBirth: call.dateOfBirth,
      gender: call.gender,
      primaryGoal: call.primaryGoal,
      country: call.country,
      phone: call.phone,
      createdAt: now,
    });
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
      createdAt: this.createdAt,
    };
  }
}
