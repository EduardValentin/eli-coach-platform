import { motion } from 'motion/react';
import { User, Target, Flame, Utensils, Heart, FileText, Droplet } from 'lucide-react';
import { useClientProfile, ACTIVITY_LEVEL_LABELS } from '../../context/ClientProfileContext';
import { useCycle, CYCLE_SYMPTOMS } from '../../context/CycleContext';

export function ClientProfile() {
  const { clientProfile } = useClientProfile();
  const { clientProfile: menstrualProfile } = useCycle();

  if (!clientProfile) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-12">
        <p className="text-neutral-500">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
          Your Profile
        </h1>
        <p className="text-neutral-500 font-medium">
          Review the information your coach has set up for you. Reach out in chat if anything needs updating.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Basic info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center">
              <User size={18} strokeWidth={2.5} />
            </div>
            <h2 className="font-serif text-xl text-[#121212] font-semibold">About You</h2>
          </div>
          <ProfileField label="Full Name" value={clientProfile.name} />
          <ProfileField label="Email" value={clientProfile.email} />
          <ProfileField label="Age" value={`${clientProfile.age} years`} />
          <ProfileField label="Gender" value={clientProfile.gender} />
        </motion.div>

        {/* Body metrics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#00796B]/10 text-[#00796B] flex items-center justify-center">
              <Target size={18} strokeWidth={2.5} />
            </div>
            <h2 className="font-serif text-xl text-[#121212] font-semibold">Body & Goals</h2>
          </div>
          <ProfileField label="Height" value={clientProfile.heightDisplay} />
          <ProfileField
            label="Starting Weight / Current"
            value={`${clientProfile.startingWeightDisplay} / ${clientProfile.currentWeightDisplay}`}
          />
          <ProfileField label="Activity Level" value={ACTIVITY_LEVEL_LABELS[clientProfile.activityLevel]} />
          <ProfileField label="Primary Goal" value={clientProfile.primaryGoal} />
        </motion.div>

        {/* Nutrition */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#FF7A45]/10 text-[#FF7A45] flex items-center justify-center">
              <Flame size={18} strokeWidth={2.5} />
            </div>
            <h2 className="font-serif text-xl text-[#121212] font-semibold">Nutrition</h2>
          </div>
          <ProfileField label="BMR" value={`${clientProfile.bmr.toLocaleString()} kcal`} />
          <ProfileField label="Daily Target" value={`${clientProfile.dailyCalories.toLocaleString()} kcal`} />
          <ProfileField
            label="Macros"
            value={`${clientProfile.proteinGrams}g Protein · ${clientProfile.carbsGrams}g Carbs · ${clientProfile.fatsGrams}g Fats`}
          />
        </motion.div>

        {/* Dietary restrictions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center">
              <Utensils size={18} strokeWidth={2.5} />
            </div>
            <h2 className="font-serif text-xl text-[#121212] font-semibold">Dietary Restrictions</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {clientProfile.dietaryRestrictions || 'None on file.'}
          </p>
        </motion.div>

        {/* Menstrual profile */}
        {menstrualProfile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-[#FF4D6D]/10 text-[#FF4D6D] flex items-center justify-center">
                <Droplet size={18} strokeWidth={2.5} />
              </div>
              <h2 className="font-serif text-xl text-[#121212] font-semibold">Menstrual Health</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <ProfileField
                label="Cycle"
                value={menstrualProfile.regularity === 'regular' ? 'Regular' : 'Irregular'}
              />
              <ProfileField
                label="Average Cycle Length"
                value={`${menstrualProfile.averageCycleLength} days`}
              />
              <ProfileField
                label="Average Period Length"
                value={`${menstrualProfile.averagePeriodLength} days`}
              />
              <ProfileField
                label="Conditions"
                value={menstrualProfile.conditions.length > 0 ? menstrualProfile.conditions.join(', ') : 'None reported'}
              />
            </div>
            {menstrualProfile.notes && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Your Notes</p>
                <p className="text-sm text-neutral-600 leading-relaxed">{menstrualProfile.notes}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="mt-8 p-5 rounded-2xl bg-[#C81D6B]/5 border border-[#C81D6B]/10 flex items-start gap-3">
        <FileText size={18} className="text-[#C81D6B] mt-0.5 shrink-0" />
        <p className="text-sm text-neutral-600 leading-relaxed">
          Something out of date? Message your coach and she&apos;ll update your profile.
        </p>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-semibold text-sm text-[#121212]">{value}</p>
    </div>
  );
}
