import { DeadEndLink, DeadEndPage } from "@eli-coach-platform/ui/layout";
import { Compass } from "lucide-react";

type RootErrorPageProps = {
  description: string;
  heading: string;
  statusLabel: string;
};

export function RootErrorPage(props: RootErrorPageProps) {
  const { description, heading, statusLabel } = props;

  return (
    <DeadEndPage
      description={description}
      eyebrow={statusLabel}
      icon={<Compass aria-hidden="true" size={36} />}
      landmarkLabel="Error"
      title={heading}
    >
      <DeadEndLink direction="back" to="/">
        Back to home
      </DeadEndLink>
    </DeadEndPage>
  );
}
