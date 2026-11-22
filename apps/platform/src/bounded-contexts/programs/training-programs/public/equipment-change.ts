import type { EquipmentOption } from "~/bounded-contexts/programs/training-programs/domain/program";

export type EquipmentChangeLine = {
  label: "Adding" | "Removing" | "Switching to";
  names: string[];
};

function line(
  label: EquipmentChangeLine["label"],
  names: string[],
): EquipmentChangeLine[] {
  return names.length > 0 ? [{ label, names }] : [];
}

export function equipmentChangeLines(
  options: readonly EquipmentOption[],
  profileEquipment: readonly string[],
  chosenEquipment: readonly string[],
): EquipmentChangeLine[] {
  const named = (kept: (value: string) => boolean) =>
    options.filter((option) => kept(option.value));
  const added = named(
    (value) =>
      chosenEquipment.includes(value) && !profileEquipment.includes(value),
  );
  const removed = named(
    (value) =>
      profileEquipment.includes(value) && !chosenEquipment.includes(value),
  );
  const switchingToExclusive = added.length === 1 && added[0].exclusive;

  return [
    ...line(
      switchingToExclusive ? "Switching to" : "Adding",
      added.map((option) => option.value),
    ),
    ...line(
      "Removing",
      removed.map((option) => option.value),
    ),
  ];
}
