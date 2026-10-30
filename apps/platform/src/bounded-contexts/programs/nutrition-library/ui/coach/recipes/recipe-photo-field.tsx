import { joinBasePath } from "~/shared/http/base-path";
import type { RecipeIcon } from "~/bounded-contexts/programs/nutrition-library/domain/nutrition";
import {
  Alert,
  AlertAction,
  Button,
  InlineProblem,
  ItemVisual,
  MediaOverlayActions,
} from "~/shared/design-system/primitives";
import { ImagePlus } from "lucide-react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

import type { RecipeBuilderView } from "~/bounded-contexts/programs/nutrition-library/public/recipes";
import { recipeGlyphOf } from "~/bounded-contexts/programs/nutrition-library/ui/shared/recipe-icons";

import {
  browserPhotoRefusalMessage,
  KEEP_PHOTO,
  RECIPE_PHOTO_ACCEPT,
  REMOVE_PHOTO,
  type RecipePhotoEntry,
  type RecipePhotoUpload,
} from "./recipe-photo-entry";

export type StoredRecipePhoto = NonNullable<
  RecipeBuilderView["recipe"]
>["photo"];

type PhotoFieldFocus = "replace" | "upload" | null;

export type RecipePhotoFieldHandle = { queueReplaceFocus: () => void };

type RecipePhotoFieldProps = {
  ref?: Ref<RecipePhotoFieldHandle>;
  icon: RecipeIcon | null;
  name: string;
  stored: StoredRecipePhoto;
  photo: RecipePhotoEntry;
  upload: RecipePhotoUpload;
  onChange: (photo: RecipePhotoEntry) => void;
  onRetry: () => void;
  children: ReactNode;
};

const UPLOAD_FAILED =
  "The upload didn’t go through. Your entries are still here.";

function shownPhotoSrcOf(
  photo: RecipePhotoEntry,
  stored: StoredRecipePhoto,
): string | null {
  if (photo.chosen.kind === "attach") return photo.chosen.previewUrl;
  if (photo.chosen.kind === "remove" || stored === null) return null;

  return joinBasePath(import.meta.env.BASE_URL, stored.path);
}

export function RecipePhotoField({
  icon,
  name: shownName,
  stored,
  photo,
  upload,
  onChange,
  onRetry,
  children,
  ref,
}: RecipePhotoFieldProps) {
  const problemId = useId();
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const replaceButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<PhotoFieldFocus>(null);
  const shownSrc = shownPhotoSrcOf(photo, stored);
  const previewUrl =
    photo.chosen.kind === "attach" ? photo.chosen.previewUrl : null;
  const problemDescription = {
    "aria-describedby": photo.problem ? problemId : undefined,
    "aria-invalid": photo.problem ? true : undefined,
  };
  const chooseFile = () => input.current?.click();

  useEffect(() => {
    if (previewUrl === null) return;

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useImperativeHandle(ref, () => ({
    queueReplaceFocus: () => {
      pendingFocus.current = "replace";
    },
  }));

  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "replace") replaceButton.current?.focus();
    if (target === "upload") uploadButton.current?.focus();
  });

  const choosePhoto = (file: File) => {
    const problem = browserPhotoRefusalMessage(file);
    if (problem) {
      onChange({ ...photo, problem });
      return;
    }

    if (shownSrc === null) pendingFocus.current = "replace";
    onChange({
      chosen: { kind: "attach", file, previewUrl: URL.createObjectURL(file) },
      problem: null,
    });
  };

  const removePhoto = () => {
    pendingFocus.current = "upload";
    onChange({
      chosen: stored ? REMOVE_PHOTO : KEEP_PHOTO,
      problem: null,
    });
  };

  return (
    <div className="mb-4 grid gap-3">
      <div className="relative overflow-hidden rounded-card">
        <ItemVisual
          className="h-40 w-full rounded-card"
          data-parity="recipe-visual"
          icon={recipeGlyphOf(icon)}
          iconSize={48}
          name={shownName}
          photo={
            shownSrc === null ? undefined : { src: shownSrc, alt: shownName }
          }
        />
        {shownSrc !== null && (
          <MediaOverlayActions
            disabled={upload === "sending"}
            onRemove={removePhoto}
            onReplace={chooseFile}
            replaceProps={problemDescription}
            replaceRef={replaceButton}
            subject="recipe photo"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shownSrc === null && (
          <Button
            aria-label="Upload recipe photo"
            data-parity="recipe-photo-upload"
            onClick={chooseFile}
            ref={uploadButton}
            size="sm"
            variant="outline"
            {...problemDescription}
          >
            <ImagePlus aria-hidden="true" size={16} />
            Upload photo
          </Button>
        )}
        {children}
      </div>
      <div
        className="empty:hidden"
        data-parity="recipe-photo-problem"
        id={problemId}
        role="alert"
      >
        {photo.problem && <InlineProblem>{photo.problem}</InlineProblem>}
      </div>
      {upload === "failed" && (
        <Alert
          action={<AlertAction onClick={onRetry}>Try again</AlertAction>}
          data-parity="recipe-photo-upload-failed"
        >
          {UPLOAD_FAILED}
        </Alert>
      )}
      <input
        accept={RECIPE_PHOTO_ACCEPT}
        aria-label="Recipe photo file input"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) choosePhoto(file);
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
}
