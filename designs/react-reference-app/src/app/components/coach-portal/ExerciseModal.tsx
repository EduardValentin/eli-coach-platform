import { useId, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Film, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useTraining, Exercise } from '../../context/TrainingContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { ToggleChip } from '../ToggleChip';
import { EXERCISE_TAGS } from '../../utils/exerciseFilters';
import {
  MP4_ACCEPT,
  isMp4File,
  mp4RejectionMessage,
} from '../../utils/exerciseVideo';
import { toast } from 'sonner';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string | null;
}

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Biceps',
  'Triceps',
];
const EQUIPMENT_LIST = [
  'Barbell',
  'Dumbbells',
  'Kettlebell',
  'Machine',
  'Cable',
  'Bands',
  'Bodyweight',
  'Bench',
];

export function ExerciseModal({
  isOpen,
  onClose,
  exerciseId,
}: ExerciseModalProps) {
  const { exercises, addExercise, updateExercise } = useTraining();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<
    'Beginner' | 'Intermediate' | 'Advanced'
  >('Beginner');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      if (exerciseId) {
        const ex = exercises.find((e) => e.id === exerciseId);
        if (ex) {
          setName(ex.name);
          setDescription(ex.description);
          setDifficulty(ex.difficulty);
          setEquipment(ex.equipment);
          setPrimaryMuscles(ex.primaryMuscles);
          setSecondaryMuscles(ex.secondaryMuscles);
          setTags(ex.tags ?? []);
          setVideoFile(null);
          setVideoPreview(ex.videoUrl ? `mock-url-${ex.videoUrl}` : null);
        }
      } else {
        // Reset
        setName('');
        setDescription('');
        setDifficulty('Beginner');
        setEquipment([]);
        setPrimaryMuscles([]);
        setSecondaryMuscles([]);
        setTags([]);
        setVideoFile(null);
        setVideoPreview(null);
      }
      setVideoError(null);
    }
    // `exercises` is read above but intentionally not a dependency: this is a
    // snapshot taken when the modal opens, not a subscription to the library.
  }, [isOpen, exerciseId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelection(file);
  };

  const handleFileSelection = (file: File | undefined) => {
    if (!file) return;
    if (!isMp4File(file)) {
      const message = mp4RejectionMessage(file);
      setVideoError(message);
      toast.error(message);
      return;
    }
    setVideoError(null);
    setVideoFile(file);
    // Create a mock local preview URL
    setVideoPreview(URL.createObjectURL(file));
  };

  const toggleSelection = (
    item: string,
    list: string[],
    setList: (val: string[]) => void,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Exercise name is required');
      return;
    }

    const edited = exerciseId
      ? exercises.find((e) => e.id === exerciseId)
      : undefined;

    const newExercise: Exercise = {
      id: exerciseId || `e-${Date.now()}`,
      thumbnailUrl: edited?.thumbnailUrl,
      name,
      description,
      difficulty,
      equipment,
      primaryMuscles,
      secondaryMuscles,
      tags,
      videoUrl: videoFile
        ? videoFile.name
        : videoPreview
          ? edited?.videoUrl
          : undefined,
    };

    if (exerciseId) {
      updateExercise(newExercise);
      toast.success('Exercise updated');
    } else {
      addExercise(newExercise);
      toast.success('Exercise created');
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-card rounded-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 px-3 border-b border-border rounded-field flex items-center justify-between gap-4 shrink-0">
          <h2
            id={titleId}
            className="text-xl font-serif font-medium text-text-primary"
          >
            {exerciseId ? 'Edit Exercise' : 'Create New Exercise'}
          </h2>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Close"
            variant="ghost"
            size="icon-sm"
          >
            <X size={20} aria-hidden="true" className="text-text-secondary" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5">Exercise Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Barbell Back Squat"
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1.5">Difficulty</Label>
                <div className="flex gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map((diff) => (
                    <Button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff as any)}
                      variant={difficulty === diff ? 'primary' : 'outline'}
                      size="sm"
                      className="flex-1"
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-text-primary mb-1.5">
                  Tags
                </legend>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_TAGS.map((tag) => (
                    <ToggleChip
                      key={tag}
                      pressed={tags.includes(tag)}
                      onPressedChange={() =>
                        toggleSelection(tag, tags, setTags)
                      }
                    >
                      {tag}
                    </ToggleChip>
                  ))}
                </div>
              </fieldset>

              <div>
                <Label className="mb-1.5">Description / Form Cues</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Keep chest up, drive through heels..."
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1.5">Equipment</Label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_LIST.map((eq) => (
                    <ToggleChip
                      key={eq}
                      pressed={equipment.includes(eq)}
                      onPressedChange={() =>
                        toggleSelection(eq, equipment, setEquipment)
                      }
                    >
                      {eq}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="mb-1.5">Demonstration Video</Label>
                {!videoPreview ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-card p-6 text-center transition-all ${
                      isDragging
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-surface-quiet hover:bg-surface-muted'
                    }`}
                  >
                    <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center mx-auto mb-3 shadow-card">
                      <UploadCloud className="text-primary" size={24} />
                    </div>
                    <p className="text-sm font-medium text-text-primary">
                      Drag and drop video
                    </p>
                    <p className="text-xs text-text-secondary mt-1 mb-4">
                      MP4 up to 50MB
                    </p>

                    <input
                      type="file"
                      accept={MP4_ACCEPT}
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => {
                        handleFileSelection(e.target.files?.[0]);
                        // Let the same file be picked again after a rejection.
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-invalid={videoError ? true : undefined}
                      aria-describedby="exercise-video-error"
                      variant="outline"
                      className="shadow-card"
                    >
                      Browse Files
                    </Button>
                  </div>
                ) : (
                  <div className="relative rounded-card overflow-hidden bg-surface-inverted aspect-video flex items-center justify-center group">
                    <video
                      src={videoPreview}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle
                        size={48}
                        className="text-surface-inverted-foreground drop-shadow-md"
                      />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        onClick={() => {
                          setVideoFile(null);
                          setVideoPreview(null);
                        }}
                        variant="ghost"
                        size="icon-sm"
                        className="bg-surface-inverted/10 text-surface-inverted-foreground backdrop-blur-md hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Remove video"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                )}
                <p
                  id="exercise-video-error"
                  role="alert"
                  className="mt-3 text-xs font-medium text-destructive empty:mt-0"
                >
                  {videoError}
                </p>
              </div>

              <div>
                <Label className="mb-1.5">Target Muscles</Label>
                <div className="mb-3">
                  <p className="text-xs text-text-secondary mb-2">Primary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((m) => (
                      <ToggleChip
                        key={`pri-${m}`}
                        pressed={primaryMuscles.includes(m)}
                        onPressedChange={() =>
                          toggleSelection(m, primaryMuscles, setPrimaryMuscles)
                        }
                      >
                        {m}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">Secondary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.filter(
                      (m) => !primaryMuscles.includes(m),
                    ).map((m) => (
                      <ToggleChip
                        key={`sec-${m}`}
                        pressed={secondaryMuscles.includes(m)}
                        onPressedChange={() =>
                          toggleSelection(
                            m,
                            secondaryMuscles,
                            setSecondaryMuscles,
                          )
                        }
                      >
                        {m}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-surface-quiet flex items-center justify-end gap-3 shrink-0">
          <Button type="button" onClick={onClose} variant="ghost" size="md">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            variant="primary"
            size="md"
            className="shadow-card"
          >
            {exerciseId ? 'Save Changes' : 'Create Exercise'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
