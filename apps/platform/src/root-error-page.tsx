import { DeadEndPage } from "@eli-coach-platform/ui/layout";
import { cn } from "@eli-coach-platform/ui/lib";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
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
      landmarkLabel="Error"
      title={heading}
    >
      <Link
        className={cn(
          buttonVariants({ size: "lg", variant: "inverted" }),
          "mt-8 px-7",
        )}
        to="/"
      >
        Back to home
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </DeadEndPage>
  );
}
