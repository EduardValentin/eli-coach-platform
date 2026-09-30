import type { JourneyPhone } from '../../domain/journey';
import { ABSENT_VALUE } from '../constants';

export function PhoneLink({ phone }: { phone: JourneyPhone | undefined }) {
  if (!phone) return <>{ABSENT_VALUE}</>;

  const dialled = `${phone.diallingCode}${phone.number}`;

  return (
    <a href={`tel:${dialled}`} className="hover:underline">
      {dialled}
    </a>
  );
}
