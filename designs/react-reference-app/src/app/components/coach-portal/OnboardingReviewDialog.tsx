import { useEffect, useId } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { MessageSquare } from 'lucide-react';
import { ResponsiveSheetDialog } from '../workout/ResponsiveSheetDialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import { reviewForms, type ReviewAnswer } from '../../domain/onboardingAnswers';
import type { ClientJourney } from '../../domain/journey';
import { ReviewAnswerValue } from './ReviewAnswerValue';

type DetailRequestValues = {
  questionIds: string[];
  message: string;
};

const EMPTY_VALUES: DetailRequestValues = { questionIds: [], message: '' };

const MESSAGE_REQUIRED = 'Write her a short note so she knows what you need.';

const REVIEW_LEAD =
  'Read through her answers. Flag anything you want her to revisit and write her a short note.';

function flaggedCountLabel(count: number): string {
  return count === 1 ? '1 question flagged' : `${count} questions flagged`;
}

function AnswerFlag({
  answer,
  checked,
  onToggle,
}: {
  answer: ReviewAnswer;
  checked: boolean;
  onToggle: (flagged: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-start gap-3 rounded-field border border-border-subtle bg-surface-base p-3 transition-colors has-[:checked]:border-brand/40">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => onToggle(value === true)}
      />
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-xs text-text-secondary">{answer.label}</span>
        <span className="mt-0.5 block text-sm text-text-primary">
          <ReviewAnswerValue answer={answer} />
        </span>
      </label>
    </div>
  );
}

export function OnboardingReviewDialog({
  journey,
  open,
  onOpenChange,
}: {
  journey: ClientJourney;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { requestDetails } = useClientJourneys();
  const form = useForm<DetailRequestValues>({ defaultValues: EMPTY_VALUES });
  const firstName = journey.identity.firstName;
  const groups = reviewForms(journey.onboarding, journey.identity.sex);

  const flagged = form.watch('questionIds');
  const message = form.watch('message');
  const ready = flagged.length > 0 && message.trim().length > 0;

  useEffect(() => {
    if (open) form.reset(EMPTY_VALUES);
  }, [open, form]);

  const submit: SubmitHandler<DetailRequestValues> = (values) => {
    requestDetails(journey.callId, {
      questionIds: values.questionIds,
      message: values.message.trim(),
      createdAt: new Date(),
    });
    onOpenChange(false);
  };

  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      size="wide"
      title={`${firstName}'s answers`}
      description={REVIEW_LEAD}
    >
      <div className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <div className="mb-1.5 flex items-center gap-1.5">
          <MessageSquare size={13} className="text-brand" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
            Review
          </span>
        </div>
        <h3 className="pr-10 font-serif text-lg leading-snug text-text-primary md:text-xl">
          {firstName}'s answers
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {REVIEW_LEAD}
        </p>
      </div>

      <Form {...form}>
        <form
          noValidate
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6">
            <FormField
              control={form.control}
              name="questionIds"
              render={({ field }) => (
                <FormItem>
                  <div className="space-y-6">
                    {groups.map((group) => (
                      <fieldset key={group.formId}>
                        <legend className="mb-3 font-serif text-base font-medium text-text-primary">
                          {group.title}
                        </legend>
                        <div className="grid gap-3 md:grid-cols-2">
                          {group.answers.map((answer) => (
                            <AnswerFlag
                              key={answer.questionId}
                              answer={answer}
                              checked={field.value.includes(answer.questionId)}
                              onToggle={(flag) =>
                                field.onChange(
                                  flag
                                    ? [...field.value, answer.questionId]
                                    : field.value.filter(
                                        (id) => id !== answer.questionId,
                                      ),
                                )
                              }
                            />
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="shrink-0 border-t border-border-subtle bg-surface-base px-5 pt-4 pb-6 md:px-8 md:pb-8">
            <FormField
              control={form.control}
              name="message"
              rules={{
                validate: (value) =>
                  value.trim().length > 0 ? true : MESSAGE_REQUIRED,
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is missing</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="text-sm text-text-secondary">
                {flaggedCountLabel(flagged.length)}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button type="submit" disabled={!ready}>
                  Ask for more details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </ResponsiveSheetDialog>
  );
}
