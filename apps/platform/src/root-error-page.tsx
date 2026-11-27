import { DeadEndLink, DeadEndPage } from "~/shared/design-system/layout";
import { BrandMark } from "~/shared/design-system/primitives";
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

export function ComingSoonPage() {
  return (
    <DeadEndPage
      data-parity-root="ComingSoon"
      description="Strength, nutrition, and cycle-aware coaching. The full site opens soon."
      eyebrow="Coming soon"
      icon={<BrandMark />}
      landmarkLabel="Coming soon"
      title="Evoa is almost here."
    />
  );
}
