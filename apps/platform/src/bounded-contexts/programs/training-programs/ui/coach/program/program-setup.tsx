import { DeadEndPanel } from "~/shared/design-system/layout";
import { ConfirmDialog } from "~/shared/design-system/overlays";
import {
  PortalBackLink,
  PortalPageHeader,
  SettingsSection,
} from "~/shared/design-system/portal";
import {
  Alert,
  Button,
  buttonVariants,
} from "~/shared/design-system/primitives";
import { ClipboardList } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Link, useActionData, useNavigate, useSubmit } from "react-router";

import { coachClientPath } from "~/bounded-contexts/clients/public/paths";
import type {
  ProgramCreateOutcome,
  ProgramSetupView,
} from "~/bounded-contexts/programs/training-programs/public/program-setup";
import { possessivePronoun } from "~/bounded-contexts/scheduling/assessment-calls/ui/shared/visitor-profile-display";

import {
  ProgramSetupFields,
  type ReadySetup,
  type SetupValues,
} from "./program-setup-fields";

type SetupClient = ProgramSetupView["client"];

type SetupProblems = Extract<
  ProgramCreateOutcome,
  { status: "invalid" }
>["problems"];

type SetupParityRoot = "ProgramSetupSheet" | "ProgramSetupNotReady";

const NOT_READY_TITLE = "Program not ready yet";

const NOT_CREATED_MESSAGE =
  "The program wasn’t created. Your choices are still here, so try again.";

const GOAL_PROBLEM = "Choose a goal.";

const EQUIPMENT_PROBLEM = "Choose at least one equipment option.";

export function programSetupTitle(view: ProgramSetupView): string {
  return view.state === "ready"
    ? `Build ${view.client.firstName}’s program`
    : NOT_READY_TITLE;
}

export function ProgramSetup({ view }: { view: ProgramSetupView }) {
  return (
    <main
      aria-label={programSetupTitle(view)}
      className="min-h-screen bg-surface-page px-4 py-10 sm:px-6 lg:py-16"
    >
      {view.state === "ready" ? (
        <ProgramSetupSheet setup={view} />
      ) : (
        <ProgramSetupNotReady client={view.client} />
      )}
    </main>
  );
}

type SetupFrameProps = {
  client: SetupClient;
  parityRoot: SetupParityRoot;
  onLeave?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
};

function SetupFrame({
  client,
  parityRoot,
  onLeave,
  children,
}: SetupFrameProps) {
  return (
    <div className="mx-auto w-full max-w-xl" data-parity-root={parityRoot}>
      <PortalBackLink
        navigationLabel="Back to the client"
        onClick={onLeave}
        to={coachClientPath(client.clientId)}
      >
        Back to {`${client.firstName} ${client.lastName}`.trim()}
      </PortalBackLink>
      {children}
    </div>
  );
}

function ProgramSetupNotReady({ client }: { client: SetupClient }) {
  const her = possessivePronoun(client.gender).lower;

  return (
    <SetupFrame client={client} parityRoot="ProgramSetupNotReady">
      <DeadEndPanel
        announcement="none"
        description={`The program opens once ${her} answers are approved.`}
        icon={<ClipboardList aria-hidden="true" size={36} />}
        title={NOT_READY_TITLE}
      />
    </SetupFrame>
  );
}

function ProgramSetupSheet({ setup }: { setup: ReadySetup }) {
  const form = useForm<SetupValues>({ defaultValues: setup.startingValues });
  const submit = useSubmit();
  const navigate = useNavigate();
  const outcome = useActionData<ProgramCreateOutcome | undefined>();
  const headingId = useId();
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const { isDirty, isSubmitting } = form.formState;
  const clientPath = coachClientPath(setup.client.clientId);
  const failed = outcome?.status === "failed" && !isSubmitting;
  useProblemsAtTheirFields(form, outcome);

  const create = form.handleSubmit((values) =>
    submit(values, { method: "post", encType: "application/json" }),
  );

  function leave(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    setConfirmingLeave(true);
  }

  return (
    <SetupFrame
      client={setup.client}
      onLeave={leave}
      parityRoot="ProgramSetupSheet"
    >
      <PortalPageHeader
        headingId={headingId}
        title={programSetupTitle(setup)}
      />
      <form noValidate onSubmit={create}>
        <SettingsSection
          footer={
            <>
              <Link
                className={buttonVariants({ size: "md", variant: "outline" })}
                onClick={leave}
                to={clientPath}
              >
                Cancel
              </Link>
              <Button
                aria-busy={isSubmitting || undefined}
                disabled={isSubmitting}
                size="md"
                type="submit"
              >
                {isSubmitting ? "Creating…" : "Create program"}
              </Button>
            </>
          }
          headingId={headingId}
        >
          <div
            className="grid gap-6 px-5 py-6 sm:px-6"
            data-parity="setup-fields"
          >
            <ProgramSetupFields choices={setup.choices} form={form} />
            {failed && <Alert>{NOT_CREATED_MESSAGE}</Alert>}
          </div>
        </SettingsSection>
      </form>
      <ConfirmDialog
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        description="Leave without creating the program? The choices you made here are lost."
        onConfirm={() => navigate(clientPath)}
        onOpenChange={setConfirmingLeave}
        open={confirmingLeave}
        title="Unsaved changes"
        tone="destructive"
      />
    </SetupFrame>
  );
}

function useProblemsAtTheirFields(
  form: UseFormReturn<SetupValues>,
  outcome: ProgramCreateOutcome | undefined,
) {
  useEffect(() => {
    if (outcome?.status !== "invalid") return;

    showProblems(form, outcome.problems);
  }, [form, outcome]);
}

function showProblems(
  form: UseFormReturn<SetupValues>,
  { goal, equipment }: SetupProblems,
) {
  if (equipment) {
    form.setError(
      "equipment",
      { message: EQUIPMENT_PROBLEM },
      { shouldFocus: !goal },
    );
  }

  if (goal) {
    form.setError("goal", { message: GOAL_PROBLEM }, { shouldFocus: true });
  }
}
