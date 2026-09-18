import {
  DEAD_END_ACTION_CLASS_NAME,
  DeadEndPage,
} from "@eli-coach-platform/ui/layout";
import { ArrowRight, Compass } from "lucide-react";
import { Link } from "react-router";

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
      label="Error"
      title={heading}
    >
      <Link className={DEAD_END_ACTION_CLASS_NAME} to="/">
        Back to home
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </DeadEndPage>
  );
}
