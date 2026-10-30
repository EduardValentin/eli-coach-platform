type SlotPickerSlot = {
  label: string;
  startsAt: string;
};

export type SlotPickerDay = {
  heading: string;
  slots: readonly SlotPickerSlot[];
};

export type SlotPickerDays = ReadonlyMap<string, SlotPickerDay>;

export type SlotPickerWording = {
  availableDays: string;
  changeDate: string;
  noOpenSlots: string;
  pastDay: string;
  selected: string;
  today: string;
};

export type CalendarDayReader = (date: Date) => string;
