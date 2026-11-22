import { BODYWEIGHT_ONLY, CLIENT_EQUIPMENT, type ClientEquipment } from './clientProfile';

export type EquipmentChangeLine = {
  label: 'Adding' | 'Removing' | 'Switching to';
  names: ClientEquipment[];
};

function inListOrder(items: readonly ClientEquipment[]): ClientEquipment[] {
  return CLIENT_EQUIPMENT.filter(item => items.includes(item));
}

function line(label: EquipmentChangeLine['label'], names: ClientEquipment[]): EquipmentChangeLine[] {
  return names.length > 0 ? [{ label, names }] : [];
}

export function equipmentChangeLines(
  profileEquipment: readonly ClientEquipment[],
  chosenEquipment: readonly ClientEquipment[],
): EquipmentChangeLine[] {
  const added = inListOrder(chosenEquipment.filter(item => !profileEquipment.includes(item)));
  const removed = inListOrder(profileEquipment.filter(item => !chosenEquipment.includes(item)));
  const switchingToBodyweight = added.length === 1 && added[0] === BODYWEIGHT_ONLY;
  return [
    ...line(switchingToBodyweight ? 'Switching to' : 'Adding', added),
    ...line('Removing', removed),
  ];
}
