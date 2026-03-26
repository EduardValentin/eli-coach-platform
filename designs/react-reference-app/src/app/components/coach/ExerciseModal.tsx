import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Film, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useTraining, Exercise } from '../../context/TrainingContext';
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setVideoFile(null);
        setVideoPreview(null);
      }
    }
  }, [isOpen, exerciseId, exercises]);

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
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      // Create a mock local preview URL
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    } else if (file) {
      toast.error('Please upload a valid video file (.mp4, .mov)');
    }
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

    const newExercise: Exercise = {
      id: exerciseId || `e-${Date.now()}`,
      name,
      description,
      difficulty,
      equipment,
      primaryMuscles,
      secondaryMuscles,
      videoUrl: videoFile ? videoFile.name : (videoPreview ? 'existing-video.mp4' : undefined)
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#121212]/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-serif font-bold text-[#121212]">
            {exerciseId ? 'Edit Exercise' : 'Create New Exercise'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Exercise Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Barbell Back Squat"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#C81D6B] focus:ring-1 focus:ring-[#C81D6B] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff as any)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-all ${
                        difficulty === diff 
                          ? 'bg-[#121212] border-[#121212] text-white' 
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Description / Form Cues</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Keep chest up, drive through heels..."
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#C81D6B] focus:ring-1 focus:ring-[#C81D6B] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Equipment Needed</label>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_LIST.map(eq => (
                    <button
                      key={eq}
                      onClick={() => toggleSelection(eq, equipment, setEquipment)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        equipment.includes(eq)
                          ? 'bg-[#00796B]/10 border-[#00796B]/20 text-[#00796B]'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Demonstration Video</label>
                {!videoPreview ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      isDragging ? 'border-[#C81D6B] bg-[#C81D6B]/5' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100/50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <UploadCloud className="text-[#C81D6B]" size={24} />
                    </div>
                    <p className="text-sm font-semibold text-[#121212]">Drag and drop video</p>
                    <p className="text-xs text-neutral-500 mt-1 mb-4">MP4, MOV up to 50MB</p>
                    
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => handleFileSelection(e.target.files?.[0])}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-neutral-200 text-sm font-medium rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
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
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#121212] mb-1.5">Target Muscles</label>
                <div className="mb-3">
                  <p className="text-xs text-neutral-500 mb-2">Primary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map(m => (
                      <button
                        key={`pri-${m}`}
                        onClick={() => toggleSelection(m, primaryMuscles, setPrimaryMuscles)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          primaryMuscles.includes(m)
                            ? 'bg-[#C81D6B] border-[#C81D6B] text-white'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-2">Secondary</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.filter(m => !primaryMuscles.includes(m)).map(m => (
                      <button
                        key={`sec-${m}`}
                        onClick={() => toggleSelection(m, secondaryMuscles, setSecondaryMuscles)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          secondaryMuscles.includes(m)
                            ? 'bg-neutral-800 border-neutral-800 text-white'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        {m}
                      </button>
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
            className="px-5 py-2.5 font-semibold text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#C81D6B] text-white font-semibold rounded-xl hover:bg-[#a31556] transition-colors shadow-md"
          >
            {exerciseId ? 'Save Changes' : 'Create Exercise'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}