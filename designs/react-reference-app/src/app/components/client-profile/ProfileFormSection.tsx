import { useId, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { SettingsRows, SettingsSection } from '../SettingsSection';
import { Button } from '../ui/button';
import { Form } from '../ui/form';
import type { OnboardingValues } from '../client-portal/onboarding/onboardingValues';

const UNSAVED_MESSAGE = "Your changes weren't saved. Try again.";

type ProfileFormSectionProps = {
  headingId: string;
  title: ReactNode;
  icon: LucideIcon;
  description: ReactNode;
  form: UseFormReturn<OnboardingValues>;
  onSave: (values: OnboardingValues) => Promise<void>;
  parityRoot: string;
  children: ReactNode;
};

export function ProfileFormSection({
  headingId,
  title,
  icon,
  description,
  form,
  onSave,
  parityRoot,
  children,
}: ProfileFormSectionProps) {
  const formId = useId();
  const { isDirty, isSubmitting } = form.formState;

  const save = form.handleSubmit(async (values) => {
    try {
      await onSave(values);
      form.reset(values);
      toast.success('Changes saved');
    } catch {
      toast.error(UNSAVED_MESSAGE);
    }
  });

  return (
    <SettingsSection
      headingId={headingId}
      title={title}
      icon={icon}
      description={description}
      parityRoot={parityRoot}
      footer={
        <Button
          type="submit"
          form={formId}
          variant="primary"
          size="md"
          disabled={!isDirty || isSubmitting}
          aria-busy={isSubmitting || undefined}
          data-parity="section-save"
        >
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      }
    >
      <Form {...form}>
        <form id={formId} noValidate onSubmit={save}>
          <SettingsRows>{children}</SettingsRows>
        </form>
      </Form>
    </SettingsSection>
  );
}
