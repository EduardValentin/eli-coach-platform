import { SettingsRows, SettingsSection } from "~/shared/design-system/portal";
import { Button } from "~/shared/design-system/primitives";
import type { LucideIcon } from "lucide-react";
import { useId, type FormEventHandler, type ReactNode } from "react";

export const PROFILE_SAVE_TOASTS = {
  saved: "Changes saved",
  unsaved: "Your changes weren't saved. Try again.",
} as const;

type ProfileFormSectionProps = {
  heading: {
    id: string;
    title: ReactNode;
    icon: LucideIcon;
    description: ReactNode;
  };
  parityRoot: string;
  submission: {
    changed: boolean;
    saving: boolean;
    onSubmit: FormEventHandler<HTMLFormElement>;
  };
  children: ReactNode;
};

export function ProfileFormSection({
  heading,
  parityRoot,
  submission,
  children,
}: ProfileFormSectionProps) {
  const formId = useId();

  return (
    <SettingsSection
      data-parity-root={parityRoot}
      description={heading.description}
      footer={
        <Button
          aria-busy={submission.saving || undefined}
          data-parity="section-save"
          disabled={!submission.changed || submission.saving}
          form={formId}
          size="md"
          type="submit"
          variant="primary"
        >
          {submission.saving ? "Saving…" : "Save changes"}
        </Button>
      }
      headingId={heading.id}
      icon={heading.icon}
      title={heading.title}
    >
      <form id={formId} noValidate onSubmit={submission.onSubmit}>
        <SettingsRows>{children}</SettingsRows>
      </form>
    </SettingsSection>
  );
}
