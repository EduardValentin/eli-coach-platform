import { useState, useRef, useEffect } from 'react';
import { Save, FileText } from 'lucide-react';
import { useTraining, PlanWeek, DayType } from '../../context/TrainingContext';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router';
import { PlanBuilder } from '../../components/coach/PlanBuilder';

function makeBlankWeeks(): PlanWeek[] {
  return Array.from({ length: 4 }).map((_, i) => ({
    id: `w-${Date.now()}-${i}`,
    order: i + 1,
    isDeload: i === 3,
    days: Array.from({ length: 7 }).map((__, j) => ({
      id: `d-${Date.now()}-${i}-${j}`,
      dayOfWeek: j,
      type: 'Rest' as DayType,
      exercises: [],
    })),
  }));
}

export function PlanBuilderPage() {
  const { templateId } = useParams<{ templateId?: string }>();
  const { addTemplate, planTemplates } = useTraining();
  const navigate = useNavigate();

  // Load existing template or create blank
  const existingTemplate = templateId ? planTemplates.find(t => t.id === templateId) : null;

  const [name, setName] = useState(existingTemplate?.name ?? '');
  const [initialWeeks] = useState<PlanWeek[]>(() =>
    existingTemplate ? JSON.parse(JSON.stringify(existingTemplate.weeks)) : makeBlankWeeks()
  );
  const weeksRef = useRef<PlanWeek[]>(initialWeeks);
  const isEditing = !!existingTemplate;

  const handleSave = (isDraft: boolean = false) => {
    if (!name.trim()) {
      toast.error('Please name the template');
      return;
    }
    addTemplate({
      id: existingTemplate?.id ?? `tmpl-${Date.now()}`,
      name: isDraft ? `${name} (Draft)` : name,
      weeks: weeksRef.current,
      createdAt: existingTemplate?.createdAt ?? new Date().toISOString().split('T')[0],
    });
    toast.success(
      isEditing
        ? 'Template updated!'
        : isDraft
          ? 'Template saved as draft!'
          : 'Template saved!'
    );
    navigate('/coach/training');
  };

  return (
    <PlanBuilder
      initialWeeks={initialWeeks}
      originalWeekCount={0}
      onBack={() => navigate('/coach/training')}
      onWeeksChange={(w) => { weeksRef.current = w; }}
      idPrefix="pb"
      headerCenter={
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter Template Name..."
          className="text-lg lg:text-xl font-serif font-bold text-[#121212] focus:outline-none placeholder:text-neutral-300 bg-transparent min-w-0 flex-1"
        />
      }
      headerRight={
        <>
          <button
            onClick={() => handleSave(true)}
            className="hidden sm:flex px-4 py-2 font-semibold text-neutral-600 border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-colors items-center gap-2"
          >
            <FileText size={18} /> <span className="hidden lg:inline">Save Draft</span>
          </button>
          <button
            onClick={() => handleSave(false)}
            className="px-4 lg:px-5 py-2 bg-[#121212] text-white font-semibold rounded-xl hover:bg-neutral-800 transition-colors shadow-md flex items-center gap-2"
          >
            <Save size={18} /> <span className="hidden sm:inline">{isEditing ? 'Save Template' : 'Save Template'}</span>
          </button>
        </>
      }
    />
  );
}
