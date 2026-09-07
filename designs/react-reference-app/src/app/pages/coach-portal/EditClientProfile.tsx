import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ToggleChip } from '../../components/ToggleChip';
import {
  useClientProfile,
  fullName,
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_LABELS,
  ActivityLevel,
  Gender,
} from '../../context/ClientProfileContext';
import {
  useCycle,
  CYCLE_CONDITIONS,
  CycleRegularity,
} from '../../context/CycleContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import {
  cmToFtIn, ftInToCm, fromDisplayWeight, displayWeightValue,
  formatHeight, formatBodyWeight, weightUnitLabel,
} from '../../utils/units';

const GENDERS: Gender[] = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export function EditClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProfile, updateProfile } = useClientProfile();
  const { getClientProfile: getMenstrualProfile, setMenstrualProfile } = useCycle();
  const { weightUnit, heightUnit } = useUnitPreferences();

  const clientId = id || 'client-1';
  const profile = getProfile(clientId);
  const menstrual = getMenstrualProfile(clientId);

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    age: String(profile?.age ?? ''),
    gender: (profile?.gender ?? 'Female') as Gender,
    heightCm: profile?.heightCm != null ? String(Math.round(profile.heightCm)) : '',
    heightFt: profile?.heightCm != null ? String(cmToFtIn(profile.heightCm).ft) : '',
    heightIn: profile?.heightCm != null ? String(cmToFtIn(profile.heightCm).inch) : '',
    startingWeight: profile?.startingWeightKg != null ? String(displayWeightValue(profile.startingWeightKg, weightUnit)) : '',
    currentWeight: profile?.currentWeightKg != null ? String(displayWeightValue(profile.currentWeightKg, weightUnit)) : '',
    activityLevel: (profile?.activityLevel ?? 'moderately-active') as ActivityLevel,
    primaryGoal: profile?.primaryGoal ?? '',
    bmr: String(profile?.bmr ?? ''),
    dailyCalories: String(profile?.dailyCalories ?? ''),
    proteinGrams: String(profile?.proteinGrams ?? ''),
    carbsGrams: String(profile?.carbsGrams ?? ''),
    fatsGrams: String(profile?.fatsGrams ?? ''),
    dietaryRestrictions: profile?.dietaryRestrictions ?? '',
    coachNotes: profile?.coachNotes ?? '',
    regularity: (menstrual?.regularity ?? 'regular') as CycleRegularity,
    averageCycleLength: String(menstrual?.averageCycleLength ?? 28),
    averagePeriodLength: String(menstrual?.averagePeriodLength ?? 5),
    conditions: menstrual?.conditions ?? [],
    menstrualNotes: menstrual?.notes ?? '',
  });

  if (!profile) {
    return (
      <div className="w-full max-w-3xl mx-auto pb-12">
        <p className="text-text-secondary">Client not found.</p>
      </div>
    );
  }

  const toggleCondition = (c: string) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(c)
        ? prev.conditions.filter(x => x !== c)
        : [...prev.conditions, c],
    }));
  };

  const handleSave = () => {
    const heightCm = heightUnit === 'cm'
      ? (parseFloat(form.heightCm) || 0)
      : ftInToCm(parseInt(form.heightFt) || 0, parseInt(form.heightIn) || 0);
    const startingWeightKg = fromDisplayWeight(parseFloat(form.startingWeight) || 0, weightUnit);
    const currentWeightKg = fromDisplayWeight(parseFloat(form.currentWeight) || 0, weightUnit);

    updateProfile(clientId, {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      age: parseInt(form.age) || 0,
      gender: form.gender,
      heightCm,
      startingWeightKg,
      currentWeightKg,
      // keep legacy display strings in sync for any remaining readers
      heightDisplay: formatHeight(heightCm, heightUnit),
      startingWeightDisplay: formatBodyWeight(startingWeightKg, weightUnit),
      currentWeightDisplay: formatBodyWeight(currentWeightKg, weightUnit),
      activityLevel: form.activityLevel,
      primaryGoal: form.primaryGoal,
      bmr: parseInt(form.bmr) || 0,
      dailyCalories: parseInt(form.dailyCalories) || 0,
      proteinGrams: parseInt(form.proteinGrams) || 0,
      carbsGrams: parseInt(form.carbsGrams) || 0,
      fatsGrams: parseInt(form.fatsGrams) || 0,
      dietaryRestrictions: form.dietaryRestrictions,
      coachNotes: form.coachNotes,
    });
    setMenstrualProfile(clientId, {
      regularity: form.regularity,
      averageCycleLength: parseInt(form.averageCycleLength) || 28,
      averagePeriodLength: parseInt(form.averagePeriodLength) || 5,
      conditions: form.conditions,
      notes: form.menstrualNotes,
    });
    toast.success('Profile updated');
    navigate(`/coach/clients/${clientId}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      <Link
        to={`/coach/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to {fullName(profile)}
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-text-primary mb-3 tracking-tight">
          Edit Profile
        </h1>
        <p className="text-text-secondary font-medium">
          Update {fullName(profile)}&apos;s profile information. Changes are visible to the client except for your private notes.
        </p>
      </header>

      <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 space-y-12">
        {/* Basic Information */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl text-text-primary mb-2">Basic Information</h2>
            <p className="text-sm text-text-secondary">Who they are and how to reach them.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">First Name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Last Name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({ ...form, gender: e.target.value as Gender })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm bg-transparent"
                >
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        {/* Body & Activity */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl text-text-primary mb-2">Body & Activity</h2>
            <p className="text-sm text-text-secondary">Measurements and training baseline.</p>
          </div>
          <div className="space-y-4">
            {heightUnit === 'cm' ? (
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Height (cm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.heightCm}
                  onChange={e => setForm({ ...form, heightCm: e.target.value })}
                  placeholder="165"
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Height (ft)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.heightFt}
                    onChange={e => setForm({ ...form, heightFt: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Height (in)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.heightIn}
                    onChange={e => setForm({ ...form, heightIn: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Starting Weight ({weightUnitLabel(weightUnit)})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.startingWeight}
                  onChange={e => setForm({ ...form, startingWeight: e.target.value })}
                  placeholder={weightUnit === 'kg' ? '68' : '150'}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Current Weight ({weightUnitLabel(weightUnit)})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.currentWeight}
                  onChange={e => setForm({ ...form, currentWeight: e.target.value })}
                  placeholder={weightUnit === 'kg' ? '66' : '145'}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Activity Level</label>
              <select
                value={form.activityLevel}
                onChange={e => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm bg-transparent"
              >
                {ACTIVITY_LEVELS.map(a => (
                  <option key={a} value={a}>{ACTIVITY_LEVEL_LABELS[a]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Primary Goal</label>
              <input
                type="text"
                value={form.primaryGoal}
                onChange={e => setForm({ ...form, primaryGoal: e.target.value })}
                placeholder="e.g. Body Recomposition"
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        {/* Nutrition */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl text-text-primary mb-2">Nutrition</h2>
            <p className="text-sm text-text-secondary">Daily targets and macro breakdown.</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">BMR (kcal)</label>
                <input
                  type="number"
                  value={form.bmr}
                  onChange={e => setForm({ ...form, bmr: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Daily Target (kcal)</label>
                <input
                  type="number"
                  value={form.dailyCalories}
                  onChange={e => setForm({ ...form, dailyCalories: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Protein (g)</label>
                <input
                  type="number"
                  value={form.proteinGrams}
                  onChange={e => setForm({ ...form, proteinGrams: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Carbs (g)</label>
                <input
                  type="number"
                  value={form.carbsGrams}
                  onChange={e => setForm({ ...form, carbsGrams: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Fats (g)</label>
                <input
                  type="number"
                  value={form.fatsGrams}
                  onChange={e => setForm({ ...form, fatsGrams: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Dietary Restrictions</label>
              <input
                type="text"
                value={form.dietaryRestrictions}
                onChange={e => setForm({ ...form, dietaryRestrictions: e.target.value })}
                placeholder="e.g. Dairy-free, Gluten sensitive"
                className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        {/* Menstrual Health */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl text-text-primary mb-2">Menstrual Health</h2>
            <p className="text-sm text-text-secondary">Cycle information and conditions the client has shared.</p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 block">Cycle Regularity</label>
              <div className="flex gap-3">
                {(['regular', 'irregular'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setForm({ ...form, regularity: opt })}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                      form.regularity === opt
                        ? 'bg-brand text-white shadow-md'
                        : 'bg-neutral-50 text-text-secondary border border-neutral-100 hover:bg-neutral-100'
                    }`}
                  >
                    {opt === 'regular' ? 'Regular' : 'Irregular'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Avg Cycle Length (days)</label>
                <input
                  type="number"
                  value={form.averageCycleLength}
                  onChange={e => setForm({ ...form, averageCycleLength: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Avg Period Length (days)</label>
                <input
                  type="number"
                  value={form.averagePeriodLength}
                  onChange={e => setForm({ ...form, averagePeriodLength: e.target.value })}
                  className="w-full px-3 border-b border-neutral-200 rounded-md py-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3 block">Conditions</label>
              <div className="flex flex-wrap gap-2">
                {CYCLE_CONDITIONS.map(c => (
                  <ToggleChip
                    key={c}
                    pressed={form.conditions.includes(c)}
                    onPressedChange={() => toggleCondition(c)}
                  >
                    {c}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">Cycle Notes</label>
              <textarea
                value={form.menstrualNotes}
                onChange={e => setForm({ ...form, menstrualNotes: e.target.value })}
                rows={3}
                className="w-full border border-neutral-200 rounded-xl p-4 focus:outline-none transition-colors text-sm resize-none"
              />
            </div>
          </div>
        </section>

        <div className="border-t border-neutral-100" />

        {/* Coach Notes */}
        <section className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl text-text-primary mb-2">Coach Notes</h2>
            <p className="text-sm text-text-secondary">Private notes visible only to you.</p>
          </div>
          <textarea
            value={form.coachNotes}
            onChange={e => setForm({ ...form, coachNotes: e.target.value })}
            rows={4}
            placeholder="Observations and reminders, not visible to the client"
            className="w-full border border-neutral-200 rounded-xl p-4 focus:outline-none transition-colors text-sm resize-none"
          />
        </section>
      </div>

      {/* Footer actions */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Link
          to={`/coach/clients/${clientId}`}
          className="px-6 py-3 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-md flex items-center gap-2"
        >
          <Check size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
