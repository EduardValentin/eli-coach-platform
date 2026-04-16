import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppState } from '../../context/AppContext';
import {
  useCycle,
  CYCLE_SYMPTOMS,
  CYCLE_CONDITIONS,
  CycleRegularity,
  CycleSymptom,
} from '../../context/CycleContext';

const TOTAL_STEPS = 4;

export function ClientOnboarding() {
  const navigate = useNavigate();
  const { appState, setAppState } = useAppState();
  const { setMenstrualProfile } = useCycle();
  const [step, setStep] = useState(1);

  // Pre-filled from "coach" data (mock)
  const [formData, setFormData] = useState({
    name: 'Jane Doe',
    age: '28',
    gender: 'Female',
    regularity: 'regular' as CycleRegularity,
    averageCycleLength: '28',
    averagePeriodLength: '5',
    lastPeriodStart: '',
    conditions: [] as string[],
    commonSymptoms: [] as CycleSymptom[],
    notes: '',
  });

  if (!appState.isAuthenticated || appState.role !== 'client') {
    navigate('/');
    return null;
  }

  const handleNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const toggleCondition = (c: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.includes(c)
        ? prev.conditions.filter(x => x !== c)
        : [...prev.conditions, c],
    }));
  };

  const toggleSymptom = (s: CycleSymptom) => {
    setFormData(prev => ({
      ...prev,
      commonSymptoms: prev.commonSymptoms.includes(s)
        ? prev.commonSymptoms.filter(x => x !== s)
        : [...prev.commonSymptoms, s],
    }));
  };

  const handleComplete = () => {
    setMenstrualProfile('client-1', {
      regularity: formData.regularity,
      averageCycleLength: parseInt(formData.averageCycleLength) || 28,
      averagePeriodLength: parseInt(formData.averagePeriodLength) || 5,
      conditions: formData.conditions,
      notes: formData.notes,
    });
    setAppState({ needsOnboarding: false });
    navigate('/portal');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-start justify-center px-4 py-12 lg:py-20">
      <div className="w-full max-w-2xl">
        {/* Brand header */}
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold text-[#C81D6B] uppercase tracking-[0.2em] mb-2">
            Welcome to Eli Fitness
          </p>
          <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] tracking-tight">
            Let&apos;s get you set up
          </h1>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                i + 1 <= step ? 'bg-[#C81D6B]' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {/* Step 1: Verify Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#121212] mb-2">
                      Let&apos;s make sure we have your details right
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Your coach set some basics for you. Feel free to correct anything.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                          Age
                        </label>
                        <input
                          type="number"
                          value={formData.age}
                          onChange={e => setFormData({ ...formData, age: e.target.value })}
                          className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm bg-transparent"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Cycle Info */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#121212] mb-2">
                      Tell us about your cycle
                    </h2>
                    <p className="text-sm text-neutral-500">
                      This helps us tailor your training and nutrition to your body.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 block">
                        Is your period regular?
                      </label>
                      <div className="flex gap-3">
                        {(['regular', 'irregular'] as const).map(opt => (
                          <button
                            key={opt}
                            onClick={() => setFormData({ ...formData, regularity: opt })}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                              formData.regularity === opt
                                ? 'bg-[#C81D6B] text-white shadow-md'
                                : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'
                            }`}
                          >
                            {opt === 'regular' ? 'Regular' : 'Irregular'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                          Average Cycle Length (days)
                        </label>
                        <input
                          type="number"
                          value={formData.averageCycleLength}
                          onChange={e => setFormData({ ...formData, averageCycleLength: e.target.value })}
                          className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm"
                          placeholder="28"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
                          Average Period Length (days)
                        </label>
                        <input
                          type="number"
                          value={formData.averagePeriodLength}
                          onChange={e => setFormData({ ...formData, averagePeriodLength: e.target.value })}
                          className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm"
                          placeholder="5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Conditions */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#121212] mb-2">
                      Any conditions we should know about?
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Select any that apply. This stays between you and your coach.
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 block">
                      Conditions
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CYCLE_CONDITIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCondition(c)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            formData.conditions.includes(c)
                              ? 'bg-[#C81D6B]/10 text-[#C81D6B] ring-1 ring-[#C81D6B]/20'
                              : 'bg-neutral-50 text-neutral-600 border border-neutral-100 hover:bg-neutral-100'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 block">
                      Common Symptoms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CYCLE_SYMPTOMS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => toggleSymptom(s.value)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            formData.commonSymptoms.includes(s.value)
                              ? 'bg-[#C81D6B]/10 text-[#C81D6B] ring-1 ring-[#C81D6B]/20'
                              : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Notes + Completion */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#121212] mb-2">
                      Anything else you&apos;d like to share?
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Your coach will see these notes on your profile.
                    </p>
                  </div>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. I experience severe cramps on day 1-2, specific food sensitivities during luteal phase..."
                    className="w-full border border-neutral-200 rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-[#C81D6B] transition-colors text-sm resize-none"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="px-6 py-3 text-sm font-semibold text-neutral-500 hover:text-[#121212] transition-colors disabled:opacity-0 flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-[#C81D6B] text-white text-sm font-semibold rounded-xl hover:bg-[#a31556] transition-colors shadow-md flex items-center gap-2"
              >
                <Check size={16} />
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
