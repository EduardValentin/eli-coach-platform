import { useId, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { ResponsiveSheetDialog } from '../workout/ResponsiveSheetDialog';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { DateField } from '../DateField';
import { subYears } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { useAppState } from '../../context/AppContext';
import { COUNTRIES, diallingCodeFor } from '../../domain/countries';
import type {
  ClientJourney,
  JourneyIdentity,
  JourneySex,
} from '../../domain/journey';
import {
  InvitationError,
  sendInvitation,
  type SentInvitation,
} from '../../services/invitationService';

const YOUNGEST_CLIENT_AGE = 16;
const OLDEST_CLIENT_AGE = 100;
const TYPICAL_CLIENT_AGE = 30;

type InviteFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phoneDiallingCode: string;
  phone: string;
  sex: JourneySex;
  country: string;
};

type InviteResult =
  | { kind: 'sent'; email: string; replaced: boolean }
  | { kind: 'already-client' }
  | { kind: 'delivery-failure' };

export type InvitationAccepted = {
  invitation: SentInvitation;
  identity: JourneyIdentity;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REPLACED_MESSAGE = 'Her earlier invitation no longer works.';
const ALREADY_CLIENT_MESSAGE = 'This email already belongs to a client.';
const DELIVERY_FAILURE_MESSAGE =
  'Saved, but the email could not be sent. Try again in a moment.';

function defaultValues(identity: JourneyIdentity): InviteFormValues {
  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    dateOfBirth: identity.dateOfBirth,
    email: identity.email,
    phoneDiallingCode:
      identity.phone?.diallingCode ?? diallingCodeFor(identity.country),
    phone: identity.phone?.number ?? '',
    sex: identity.sex,
    country: identity.country,
  };
}

function toIdentity(values: InviteFormValues): JourneyIdentity {
  const phone = values.phone.trim();

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: values.dateOfBirth,
    email: values.email.trim(),
    phone:
      phone.length > 0
        ? { diallingCode: values.phoneDiallingCode, number: phone }
        : undefined,
    sex: values.sex,
    country: values.country,
  };
}

function RadioOption({ value, label }: { value: string; label: string }) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="text-sm text-text-primary">
        {label}
      </label>
    </div>
  );
}

function visitorNameOf(journey: ClientJourney): string {
  return `${journey.identity.firstName} ${journey.identity.lastName}`.trim();
}

function InviteForm({
  journey,
  onClose,
  onInvited,
}: {
  journey: ClientJourney;
  onClose: () => void;
  onInvited: (accepted: InvitationAccepted) => void;
}) {
  const { appState } = useAppState();
  const [result, setResult] = useState<InviteResult | null>(null);
  const form = useForm<InviteFormValues>({
    defaultValues: defaultValues(journey.identity),
  });
  const today = new Date();

  const submit: SubmitHandler<InviteFormValues> = async (values) => {
    const identity = toIdentity(values);

    try {
      const invitation = await sendInvitation(
        identity,
        appState.invitationOutcome,
      );
      setResult({
        kind: 'sent',
        email: invitation.email,
        replaced: invitation.replaced,
      });
      onInvited({ invitation, identity });
    } catch (error) {
      setResult(
        error instanceof InvitationError && error.code === 'already-client'
          ? { kind: 'already-client' }
          : { kind: 'delivery-failure' },
      );
    }
  };

  const sending = form.formState.isSubmitting;
  const visitorName = visitorNameOf(journey);

  return (
    <>
      <div className="shrink-0 border-b border-neutral-100 px-5 pt-6 pb-4 md:px-8 md:pt-8">
        <h3 className="pr-10 text-lg font-semibold leading-snug text-text-primary md:text-xl">
          Invite {visitorName}
        </h3>
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          Check her details, then send the invitation that lets her create her
          account.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8">
        {result?.kind === 'sent' ? (
          <div className="space-y-4">
            <p role="status" className="text-sm text-text-primary">
              Invitation sent to {result.email}.
              {result.replaced ? ` ${REPLACED_MESSAGE}` : ''}
            </p>
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              noValidate
              className="space-y-5"
              onSubmit={form.handleSubmit(submit)}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  rules={{ required: 'Enter her first name.' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="given-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  rules={{ required: 'Enter her last name.' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="family-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dateOfBirth"
                rules={{ required: 'Pick her date of birth.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <DateField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick her date of birth"
                        yearRange={{
                          from: today.getFullYear() - OLDEST_CLIENT_AGE,
                          to: today.getFullYear() - YOUNGEST_CLIENT_AGE,
                        }}
                        disabledDays={{
                          after: subYears(today, YOUNGEST_CLIENT_AGE),
                        }}
                        defaultMonth={subYears(today, TYPICAL_CLIENT_AGE)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{
                  required: 'Enter her email address.',
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: 'Enter a valid email address.',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <FormField
                  control={form.control}
                  name="phoneDiallingCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country code</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-auto gap-2 whitespace-nowrap">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem
                              key={country.name}
                              value={country.diallingCode}
                            >
                              {country.diallingCode} {country.isoCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          {...field}
                          autoComplete="tel-national"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <fieldset>
                      <legend className="text-sm font-medium text-text-label">
                        Sex
                      </legend>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="mt-2 flex flex-wrap gap-6"
                      >
                        <RadioOption value="female" label="Female" />
                        <RadioOption value="male" label="Male" />
                      </RadioGroup>
                    </fieldset>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                rules={{ required: 'Choose her country.' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.name} value={country.name}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {result?.kind === 'already-client' && (
                <Alert role="status">{ALREADY_CLIENT_MESSAGE}</Alert>
              )}
              {result?.kind === 'delivery-failure' && (
                <Alert role="status">{DELIVERY_FAILURE_MESSAGE}</Alert>
              )}

              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <Button type="submit" disabled={sending}>
                  {sending ? 'Sending…' : 'Send invitation'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </>
  );
}

export function InviteClientDialog({
  journey,
  open,
  onOpenChange,
  onInvited,
}: {
  journey: ClientJourney;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: (accepted: InvitationAccepted) => void;
}) {
  return (
    <ResponsiveSheetDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Invite ${visitorNameOf(journey)}`}
      description="Check her details, then send the invitation that lets her create her account."
    >
      <InviteForm
        journey={journey}
        onClose={() => onOpenChange(false)}
        onInvited={onInvited}
      />
    </ResponsiveSheetDialog>
  );
}
