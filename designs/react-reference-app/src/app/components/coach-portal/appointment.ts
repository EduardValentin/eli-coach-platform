export type AppointmentStatus = 'scheduled' | 'past';

export type AppointmentAttendee = {
  name: string;
  imageUrl?: string;
  email?: string;
  phone?: string;
};

export type AppointmentDetail = { label: string; value: string };

export type AppointmentTime = { startsAt: Date; timeZone: string };

export type AppointmentTitleElement = 'p' | 'h2' | 'h3';
