import { ABSENT_VALUE } from "@eli-coach-platform/ui/lib";

type PhoneLinkProps = {
  phone: string | null;
};

export function PhoneLink({ phone }: PhoneLinkProps) {
  if (!phone) {
    return <>{ABSENT_VALUE}</>;
  }

  return (
    <a className="hover:underline" href={`tel:${phone}`}>
      {phone}
    </a>
  );
}
