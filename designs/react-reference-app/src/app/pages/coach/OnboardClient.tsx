import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export function OnboardClient() {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Mock Form State
  const [formData, setFormData] = useState({
    name: '', email: '', age: '',
    height: '', weight: '', activity: '1.2',
    dietary: '',
    protein: '', carbs: '', fats: '',
    goal: '', notes: ''
  });

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  // Dynamic BMR Calc (Mifflin-St Jeor: simplified for mock)
  const calculateMacros = () => {
    const w = parseFloat(formData.weight) || 65; // kg
    const h = parseFloat(formData.height) || 165; // cm
    const a = parseFloat(formData.age) || 30;
    const bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    const tdee = bmr * parseFloat(formData.activity);
    return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
  };

  const macros = calculateMacros();

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      <Link to="/coach" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-[#121212] mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-4 tracking-tight">
          Onboard New Client
        </h1>
        {/* Progress Bar */}
        <div className="flex items-center gap-2 w-full">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
              i + 1 <= step ? 'bg-[#C81D6B]' : 'bg-neutral-200'
            }`} />
          ))}
        </div>
      </div>

      <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Basic Information</h2>
                  <p className="text-sm text-neutral-500">Let&apos;s start with who they are and how to reach them.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Full Name</label>
                    <input type="text" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="e.g. Jane Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Email Address</label>
                    <input type="email" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="jane@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Age</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="28" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Fitness & Measurements</h2>
                  <p className="text-sm text-neutral-500">Baseline numbers for accurate calculations.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Height (cm)</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="165" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Weight (kg)</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="65" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Activity Level</label>
                  <select className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm bg-transparent" value={formData.activity} onChange={e => setFormData({...formData, activity: e.target.value})}>
                    <option value="1.2">Sedentary (Little to no exercise)</option>
                    <option value="1.375">Lightly Active (1-3 days/week)</option>
                    <option value="1.55">Moderately Active (3-5 days/week)</option>
                    <option value="1.725">Very Active (6-7 days/week)</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Dietary Restrictions</h2>
                  <p className="text-sm text-neutral-500">Any allergies, intolerances, or preferences.</p>
                </div>
                <div>
                  <textarea 
                    className="w-full border border-neutral-200 rounded-xl p-4 min-h-[150px] focus:outline-none focus:border-[#C81D6B] transition-colors text-sm resize-none" 
                    placeholder="e.g. Gluten sensitive, prefers no red meat, allergic to peanuts..."
                    value={formData.dietary}
                    onChange={e => setFormData({...formData, dietary: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Nutrition Setup</h2>
                  <p className="text-sm text-neutral-500">Calculated baseline using Mifflin-St Jeor. Adjust as needed.</p>
                </div>
                
                <div className="flex gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Calculated BMR</p>
                    <p className="font-serif text-2xl text-[#121212]">{macros.bmr} <span className="text-xs font-sans font-medium text-neutral-500">kcal</span></p>
                  </div>
                  <div className="w-px bg-neutral-200" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Est. TDEE</p>
                    <p className="font-serif text-2xl text-[#121212]">{macros.tdee} <span className="text-xs font-sans font-medium text-neutral-500">kcal</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Protein (g)</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-2 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="130" value={formData.protein} onChange={e => setFormData({...formData, protein: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Carbs (g)</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-2 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="180" value={formData.carbs} onChange={e => setFormData({...formData, carbs: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Fats (g)</label>
                    <input type="number" className="w-full border-b border-neutral-200 py-2 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm" placeholder="60" value={formData.fats} onChange={e => setFormData({...formData, fats: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Goals & Focus</h2>
                  <p className="text-sm text-neutral-500">Set the initial directive for this client.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Primary Goal</label>
                  <input type="text" className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm mb-6" placeholder="e.g. Body Recomposition" value={formData.goal} onChange={e => setFormData({...formData, goal: e.target.value})} />
                  
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Initial Notes & Next Steps</label>
                  <textarea 
                    className="w-full border border-neutral-200 rounded-xl p-4 min-h-[100px] focus:outline-none focus:border-[#C81D6B] transition-colors text-sm resize-none" 
                    placeholder="Notes for the client to see on their dashboard..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6 flex flex-col items-center justify-center text-center pt-8">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Check size={32} strokeWidth={3} />
                </div>
                <div>
                  <h2 className="font-serif text-2xl text-[#121212] mb-2">Ready to Invite</h2>
                  <p className="text-sm text-neutral-500 max-w-sm">
                    {formData.name || 'The client'} will receive an email invitation to create their password and purchase their coaching bundle.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="mt-10 pt-6 border-t border-neutral-100 flex items-center justify-between">
          <button 
            onClick={handlePrev}
            disabled={step === 1}
            className="px-6 py-3 text-sm font-semibold text-neutral-500 hover:text-[#121212] transition-colors disabled:opacity-0"
          >
            Back
          </button>
          
          {step < totalSteps ? (
            <button 
              onClick={handleNext}
              className="px-8 py-3 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={() => alert('Invitation Email Sent!')}
              className="px-8 py-3 bg-[#C81D6B] text-white text-sm font-semibold rounded-xl hover:bg-[#a31556] transition-colors shadow-md"
            >
              Send Invitation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}