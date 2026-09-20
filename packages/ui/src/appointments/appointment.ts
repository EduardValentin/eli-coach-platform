export type AppointmentStatus = "scheduled" | "past";

export type AppointmentAttendee = {
  email?: string;
  name: string;
};

export type AppointmentTime = {
  date: string;
  time: string;
};

export type AppointmentTitleElement = "h2" | "h3" | "p";
