export type { AppointmentTime } from "../primitives/date-time-label";

export type AppointmentStatus = "scheduled" | "past";

export type AppointmentAttendee = {
  email?: string;
  name: string;
  phone?: string;
};

export type AppointmentDetail = {
  label: string;
  value: string;
};

export type AppointmentTitleElement = "h2" | "h3" | "p";
