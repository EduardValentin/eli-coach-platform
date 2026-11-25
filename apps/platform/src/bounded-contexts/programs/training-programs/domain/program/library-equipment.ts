import { EQUIPMENT, type Equipment } from "./library-exercise";

const LIBRARY_EQUIPMENT_BY_CLIENT_EQUIPMENT: Partial<
  Record<string, readonly Equipment[]>
> = {
  "Full gym": EQUIPMENT,
  Machines: ["Machine", "Cable", "Smith machine"],
  Barbell: ["Barbell", "Squat rack", "Bench", "EZ bar", "Trap bar"],
  Dumbbells: ["Dumbbells", "Bench"],
  Kettlebells: ["Kettlebell"],
  "Resistance bands": ["Bands"],
  "Bodyweight only": [],
};

export class LibraryEquipment {
  static coveredBy(clientEquipment: readonly string[]): Equipment[] {
    return [
      ...new Set(
        clientEquipment.flatMap(
          (item) => LIBRARY_EQUIPMENT_BY_CLIENT_EQUIPMENT[item] ?? [],
        ),
      ),
    ];
  }
}
