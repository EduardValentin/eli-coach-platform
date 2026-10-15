import { PREPARING_MS, UPLOAD_STEPS, UPLOAD_STEP_MS } from './resourceService';

export const EXERCISE_VIDEO_UPLOAD_OUTCOMES = [
  'works',
  'holds-uploading',
  'holds-finishing',
  'fails',
  'refused',
] as const;
export type ExerciseVideoUpload = (typeof EXERCISE_VIDEO_UPLOAD_OUTCOMES)[number];

export const HELD_UPLOAD_STEP = 2;

export const EXERCISE_VIDEO_NOT_UPLOADED = 'The exercise video did not upload.';

export type ExerciseVideoAnswer =
  | { status: 'stored'; url: string }
  | { status: 'refused'; refusal: 'unsupported' };

export type ExerciseVideoUploadOptions = {
  outcome: ExerciseVideoUpload;
  onProgress: (fraction: number) => void;
};

type UploadPhase = 'uploading' | 'finishing';

const HOLDING_OUTCOMES: Record<UploadPhase, readonly ExerciseVideoUpload[]> = {
  uploading: ['holds-uploading'],
  finishing: ['holds-uploading', 'holds-finishing'],
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function holdsAt(phase: UploadPhase, outcome: ExerciseVideoUpload): boolean {
  return HOLDING_OUTCOMES[phase].includes(outcome);
}

export class ExerciseVideoServer {
  private readonly heldAnswers: Record<UploadPhase, Set<(outcome: ExerciseVideoUpload) => void>> = {
    uploading: new Set(),
    finishing: new Set(),
  };

  async upload(file: File, options: ExerciseVideoUploadOptions): Promise<ExerciseVideoAnswer> {
    let outcome = options.outcome;
    for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
      await wait(UPLOAD_STEP_MS);
      options.onProgress(step / UPLOAD_STEPS);
      if (step === HELD_UPLOAD_STEP && holdsAt('uploading', outcome)) outcome = await this.heldAt('uploading');
    }
    if (outcome === 'fails') throw new Error(EXERCISE_VIDEO_NOT_UPLOADED);

    const answer = await this.answerAfterStoring(outcome);
    if (answer === 'fails') throw new Error(EXERCISE_VIDEO_NOT_UPLOADED);
    if (answer === 'refused') return { status: 'refused', refusal: 'unsupported' };

    return { status: 'stored', url: URL.createObjectURL(file) };
  }

  releaseHeldUploads(outcome: ExerciseVideoUpload): void {
    for (const phase of ['uploading', 'finishing'] as const) {
      if (holdsAt(phase, outcome)) continue;

      const held = [...this.heldAnswers[phase]];
      this.heldAnswers[phase].clear();
      held.forEach((answer) => answer(outcome));
    }
  }

  private async answerAfterStoring(outcome: ExerciseVideoUpload): Promise<ExerciseVideoUpload> {
    if (holdsAt('finishing', outcome)) return this.heldAt('finishing');

    await wait(PREPARING_MS);
    return outcome;
  }

  private heldAt(phase: UploadPhase): Promise<ExerciseVideoUpload> {
    return new Promise((answer) => this.heldAnswers[phase].add(answer));
  }
}
