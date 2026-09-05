import { useId, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Film, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useTraining, Exercise } from '../../context/TrainingContext';
import { ToggleChip } from '../ToggleChip';
import { EXERCISE_TAGS } from '../../utils/exerciseFilters';
import { MP4_ACCEPT, isMp4File, mp4RejectionMessage } from '../../utils/exerciseVideo';
import { toast } from 'sonner';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string | null;
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Biceps', 'Triceps'];
const EQUIPMENT_LIST = ['Barbell', 'Dumbbells', 'Kettlebell', 'Machine', 'Cable', 'Bands', 'Bodyweight', 'Bench'];

export function ExerciseModal({ isOpen, onClose, exerciseId }: ExerciseModalProps) {
  const { exercises, addExercise, updateExercise } = useTraining();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
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
        const ex = exercises.find(e => e.id === exerciseId);
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

  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Exercise name is required');
      return;
    }

    const edited = exerciseId ? exercises.find(e => e.id === exerciseId) : undefined;

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
      videoUrl: videoFile ? videoFile.name : (videoPreview ? edited?.videoUrl : undefined)
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
      <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 px-3 border-b border-neutral-100 rounded-md flex items-center justify-between gap-4 shrink-0">
          <h2 id={titleId} className="text-xl font-serif font-bold text-text-primary">
            {exerciseId ? 'Edit Exercise' : 'Create New Exercise'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 shrink-0 items-center justify-center hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X size={20} aria-hidden="true" className="text-text-secondary" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Exercise Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Barbell Back Squat"
                  className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff as any)}
                      className={`flex flex-1 items-center justify-center py-2 text-sm font-medium rounded-xl border transition-all ${
                        difficulty === diff 
                          ? 'bg-text-primary border-text-primary text-white' 
                          : 'bg-white border-neutral-200 text-text-secondary hover:bg-neutral-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset>
                <legend className="block text-sm font-semibold text-text-primary mb-1.5">Tags</legend>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_TAGS.map(tag => (
                    <ToggleChip
                      key={tag}
                      pressed={tags.includes(tag)}
                      onPressedChange={() => toggleSelection(tag, tags, setTags)}
                    >
                      {tag}
                    </ToggleChip>
                  ))}
                </div>
              </fieldset>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Description / Form Cues</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Keep chest up, drive through heels..."
                  className="block w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_LIST.map(eq => (
                    <ToggleChip
                      key={eq}
                      pressed={equipment.includes(eq)}
                      onPressedChange={() => toggleSelection(eq, equipment, setEquipment)}
                    >
                      {eq}
                    </ToggleChip>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Demonstration Video</label>
                {!videoPreview ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      isDragging ? 'border-brand bg-brand/5' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <UploadCloud className="text-brand" size={24} />
                    </div>
                    <p className="text-sm font-semibold text-text-primary">Drag and drop video</p>
                    <p className="text-xs text-text-secondary mt-1 mb-4">MP4 up to 50MB</p>
                    
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
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-invalid={videoError ? true : undefined}
                      aria-describedby="exercise-video-error"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-sm font-medium rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
                    >
                      Browse Files
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center group">
                    <video src={videoPreview} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle size={48} className="text-white drop-shadow-md" />
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setVideoFile(null);
                          setVideoPreview(null);
                        }}
                        className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-lg backdrop-blur-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
                <p
                  id="exercise-video-error"
                  role="alert"
                  className="mt-3 text-xs font-semibold text-destructive empty:mt-0"
                >
                  {videoError}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">Target Muscles</label>
                <div className="mb-3">
                  <p className="text-xs text-text-secondary mb-2">Primary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map(m => (
                      <ToggleChip
                        key={`pri-${m}`}
                        pressed={primaryMuscles.includes(m)}
                        onPressedChange={() => toggleSelection(m, primaryMuscles, setPrimaryMuscles)}
                      >
                        {m}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-2">Secondary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.filter(m => !primaryMuscles.includes(m)).map(m => (
                      <ToggleChip
                        key={`sec-${m}`}
                        pressed={secondaryMuscles.includes(m)}
                        onPressedChange={() => toggleSelection(m, secondaryMuscles, setSecondaryMuscles)}
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

        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-text-secondary hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-md"
          >
            {exerciseId ? 'Save Changes' : 'Create Exercise'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}