export const PROGRAM_STATUS_EYEBROW = "Your onboarding";
export const PROGRAM_STATUS_LABEL = "Sent to your coach";

const IMMEDIATE_LINE = "Eli has your answers and will start on them soon.";

export function programStatusLine(workStartsOn: string | null): string {
  if (!workStartsOn) {
    return IMMEDIATE_LINE;
  }

  return `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${workStartsOn}. Your program will be delivered as soon as it is completed.`;
}
