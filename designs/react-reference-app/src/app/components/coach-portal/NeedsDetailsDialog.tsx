import { useEffect } from 'react';
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
import { answeredQuestions } from '../../domain/onboardingAnswers';
import type { ClientJourney } from '../../domain/journey';

type DetailRequestValues = {
  questionIds: string[];
  message: string;
};

const EMPTY_VALUES: DetailRequestValues = { questionIds: [], message: '' };

export function NeedsDetailsDialog({
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
  const questions = answeredQuestions(journey.onboarding);
  const firstName = journey.identity.firstName;

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
      title={`Ask ${firstName} for more details`}
      description="Tick the answers you want her to revisit and write her a short note."
    >
      <div className="shrink-0 border-b border-neutral-100 px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <div className="mb-1.5 flex items-center gap-1.5">
          <MessageSquare size={13} className="text-brand" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">
            Review
          </span>
        </div>
        <h3 className="pr-10 text-lg font-semibold leading-snug text-text-primary md:text-xl">
          Ask {firstName} for more details
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          Tick the answers you want her to revisit and write her a short note.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        <Form {...form}>
          <form
            noValidate
            className="space-y-6"
            onSubmit={form.handleSubmit(submit)}
          >
            <FormField
              control={form.control}
              name="questionIds"
              render={({ field }) => (
                <FormItem>
                  <fieldset>
                    <legend className="text-sm font-medium text-text-label">
                      Answers to revisit (optional)
                    </legend>
                    <div className="mt-3 space-y-3">
                      {questions.length === 0 && (
                        <p className="text-sm text-text-secondary">
                          She has not answered anything yet.
                        </p>
                      )}
                      {questions.map((question) => (
                        <div
                          key={`${question.formId}-${question.questionId}`}
                          className="flex items-start gap-3"
                        >
                          <Checkbox
                            id={`detail-${question.questionId}`}
                            checked={field.value.includes(question.questionId)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, question.questionId]
                                  : field.value.filter(
                                      (id) => id !== question.questionId,
                                    ),
                              )
                            }
                          />
                          <label
                            htmlFor={`detail-${question.questionId}`}
                            className="text-sm text-text-primary"
                          >
                            {question.label}
                            <span className="block text-xs text-text-secondary">
                              {question.answer}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              rules={{
                validate: (value) =>
                  value.trim().length > 0
                    ? true
                    : 'Write her a short note so she knows what you need.',
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your note</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="submit">Send the request</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ResponsiveSheetDialog>
  );
}
