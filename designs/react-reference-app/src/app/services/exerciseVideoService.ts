import { PREPARING_MS, UPLOAD_STEPS, UPLOAD_STEP_MS } from './resourceService';

export const EXERCISE_VIDEO_UPLOAD_OUTCOMES = ['works', 'holds', 'fails'] as const;
export type ExerciseVideoUpload = (typeof EXERCISE_VIDEO_UPLOAD_OUTCOMES)[number];

type StoringAnswer = Exclude<ExerciseVideoUpload, 'holds'>;

export const EXERCISE_VIDEO_NOT_UPLOADED = 'The exercise video did not upload.';

export type ExerciseVideoUploadOptions = {
  outcome: ExerciseVideoUpload;
  onProgress: (fraction: number) => void;
};

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ExerciseVideoServer {
  private readonly heldAnswers = new Set<(answer: StoringAnswer) => void>();

  async upload(file: File, options: ExerciseVideoUploadOptions): Promise<string> {
    for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
      await wait(UPLOAD_STEP_MS);
      options.onProgress(step / UPLOAD_STEPS);
    }
    if (options.outcome === 'fails') throw new Error(EXERCISE_VIDEO_NOT_UPLOADED);

    const answer = await this.answerAfterStoring(options.outcome);
    if (answer === 'fails') throw new Error(EXERCISE_VIDEO_NOT_UPLOADED);

    return URL.createObjectURL(file);
  }

  releaseHeldUploads(outcome: ExerciseVideoUpload): void {
    if (outcome === 'holds') return;

    const held = [...this.heldAnswers];
    this.heldAnswers.clear();
    held.forEach((answer) => answer(outcome));
  }

  private async answerAfterStoring(outcome: ExerciseVideoUpload): Promise<StoringAnswer> {
    if (outcome === 'holds') {
      return new Promise((answer) => this.heldAnswers.add(answer));
    }

    await wait(PREPARING_MS);
    return outcome;
  }
}
