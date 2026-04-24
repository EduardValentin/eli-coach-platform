import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dumbbell, Moon, PersonStanding } from 'lucide-react';
import { SectionEyebrow } from './SectionEyebrow';

const days = [
  { id: 'mon', name: 'Mon', type: 'strength', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'tue', name: 'Tue', type: 'rest', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'wed', name: 'Wed', type: 'recovery', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
  { id: 'thu', name: 'Thu', type: 'strength', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'fri', name: 'Fri', type: 'rest', label: 'Rest', icon: Moon, color: '#616161', bg: 'rgba(247,243,240,0.6)' },
  { id: 'sat', name: 'Sat', type: 'strength', label: 'Strength', icon: Dumbbell, color: '#C81D6B', bg: 'rgba(200,29,107,0.1)' },
  { id: 'sun', name: 'Sun', type: 'recovery', label: 'Recovery', icon: PersonStanding, color: '#00796B', bg: 'rgba(0,121,107,0.1)' },
];

const typeInfo: Record<string, string> = {
  strength: "For Strength days we aim to lift heavy weights. Building strong muscles as a woman improves metabolism, bone density, and overall confidence in everyday movements.",
  recovery: "Active recovery is crucial. It keeps blood flowing and helps reduce muscle soreness. This is the period when your muscles actually grow and become stronger.",
  rest: "Rest days are just as important as workout days. Taking time off allows you to recover mentally and physically, preventing burnout and injury."
};

export function WorkoutSchedule() {
  const [activeDay, setActiveDay] = useState<string | null>(null);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-24">
        
        <div className="text-center mb-16">
          <SectionEyebrow>How a week looks</SectionEyebrow>
          <h2 className="text-3xl md:text-4xl font-serif font-medium text-foreground mb-4">Your Weekly Rhythm</h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            A balanced approach to fitness that honors your body's need for both challenge and rest. Click on any day to learn more.
          </p>
        </div>

        {/* Schedule Grid */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 md:gap-6 overflow-x-auto w-full pb-8 pt-4 hide-scrollbar snap-x snap-mandatory">
            
            <div className="hidden md:flex items-center justify-center p-2 w-16 md:w-24 shrink-0">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Week 1</span>
            </div>

            {days.map((day) => {
              const Icon = day.icon;
              const isActive = activeDay === day.id;
              return (
                <motion.div 
                  key={day.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setActiveDay(isActive ? null : day.id)}
                  className={`relative flex flex-col shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-sm cursor-pointer transition-shadow snap-center ${
                    isActive ? 'shadow-xl ring-2 ring-offset-2 ring-[#C81D6B]' : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{ backgroundColor: day.bg }}
                >
                  <div className="border-b border-white/40 p-2 text-center">
                    <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">{day.name}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2">
                    <span 
                      className="text-xs md:text-sm font-medium uppercase tracking-widest"
                      style={{ color: day.color }}
                    >
                      {day.label}
                    </span>
                    <Icon size={18} color={day.color} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info Panel */}
          <div className="min-h-[120px] w-full max-w-2xl mt-4">
            <AnimatePresence mode="wait">
              {activeDay && (
                <motion.div
                  key={activeDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-50 p-6 md:p-8 rounded-2xl text-center border border-neutral-100 shadow-sm"
                >
                  <h4 
                    className="text-sm font-bold uppercase tracking-widest mb-3"
                    style={{ color: days.find(d => d.id === activeDay)?.color }}
                  >
                    {days.find(d => d.id === activeDay)?.label} Phase
                  </h4>
                  <p className="text-neutral-700 leading-relaxed">
                    {typeInfo[days.find(d => d.id === activeDay)?.type || '']}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!activeDay && (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm italic">
                Select a day above to view details
              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
}
