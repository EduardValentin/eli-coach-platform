import { PREPARING_MS } from './resourceService';

export const RECIPE_PHOTO_UPLOAD_OUTCOMES = ['works', 'holds', 'fails', 'refused'] as const;
export type RecipePhotoUpload = (typeof RECIPE_PHOTO_UPLOAD_OUTCOMES)[number];

export const RECIPE_PHOTO_NOT_UPLOADED = 'The recipe photo did not upload.';

export type RecipePhotoAnswer =
  | { status: 'stored'; url: string }
  | { status: 'refused'; refusal: 'unsupported' };

export type RecipePhotoUploadOptions = { outcome: RecipePhotoUpload };

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class RecipePhotoServer {
  private readonly heldAnswers = new Set<(outcome: RecipePhotoUpload) => void>();

  async upload(file: File, options: RecipePhotoUploadOptions): Promise<RecipePhotoAnswer> {
    const outcome = await this.answerAfterStoring(options.outcome);
    if (outcome === 'fails') throw new Error(RECIPE_PHOTO_NOT_UPLOADED);
    if (outcome === 'refused') return { status: 'refused', refusal: 'unsupported' };

    return { status: 'stored', url: URL.createObjectURL(file) };
  }

  releaseHeldUploads(outcome: RecipePhotoUpload): void {
    if (outcome === 'holds') return;

    const held = [...this.heldAnswers];
    this.heldAnswers.clear();
    held.forEach((answer) => answer(outcome));
  }

  private async answerAfterStoring(outcome: RecipePhotoUpload): Promise<RecipePhotoUpload> {
    const reached = outcome === 'holds' ? await this.held() : outcome;
    await wait(PREPARING_MS);

    return reached;
  }

  private held(): Promise<RecipePhotoUpload> {
    return new Promise((answer) => this.heldAnswers.add(answer));
  }
}
