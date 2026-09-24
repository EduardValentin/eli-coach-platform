import { useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import {
  ArrowLeft,
  Check,
  Droplet,
  Lock,
  Ruler,
  User,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { ToggleChip } from '../../components/ToggleChip';
import { ChoiceGroup, ChoiceOption } from '../../components/ChoiceGroup';
import {
  SettingsSection,
  SettingsRows,
  SettingsRow,
} from '../../components/SettingsSection';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
  cmToFtIn,
  ftInToCm,
  fromDisplayWeight,
  displayWeightValue,
  formatHeight,
  formatBodyWeight,
  weightUnitLabel,
} from '../../utils/units';

const GENDERS: Gender[] = ['Female', 'Male', 'Prefer not to say'];

const FIRST_NAME_ID = 'client-first-name';
const LAST_NAME_ID = 'client-last-name';
const EMAIL_ID = 'client-email';
const AGE_ID = 'client-age';
const GENDER_ID = 'client-gender';
const HEIGHT_CM_ID = 'client-height-cm';
const HEIGHT_FT_ID = 'client-height-ft';
const HEIGHT_IN_ID = 'client-height-in';
const STARTING_WEIGHT_ID = 'client-starting-weight';
const CURRENT_WEIGHT_ID = 'client-current-weight';
const ACTIVITY_LEVEL_ID = 'client-activity-level';
const PRIMARY_GOAL_ID = 'client-primary-goal';
const BMR_ID = 'client-bmr';
const DAILY_CALORIES_ID = 'client-daily-calories';
const PROTEIN_ID = 'client-protein';
const CARBS_ID = 'client-carbs';
const FATS_ID = 'client-fats';
const DIETARY_RESTRICTIONS_ID = 'client-dietary-restrictions';
const REGULARITY_LABEL_ID = 'client-regularity-label';
const CYCLE_LENGTH_ID = 'client-cycle-length';
const PERIOD_LENGTH_ID = 'client-period-length';
const CONDITIONS_LABEL_ID = 'client-conditions-label';
const MENSTRUAL_NOTES_ID = 'client-menstrual-notes';
const COACH_NOTES_ID = 'client-coach-notes';

export function EditClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProfile, updateProfile } = useClientProfile();
  const { getClientProfile: getMenstrualProfile, setMenstrualProfile } =
    useCycle();
  const { weightUnit, heightUnit } = useUnitPreferences();

  const clientId = id || 'client-1';
  const profile = getProfile(clientId);
  const menstrual = getMenstrualProfile(clientId);

  const buildForm = () => ({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    age: String(profile?.age ?? ''),
    gender: (profile?.gender ?? 'Female') as Gender,
    heightCm:
      profile?.heightCm != null ? String(Math.round(profile.heightCm)) : '',
    heightFt:
      profile?.heightCm != null ? String(cmToFtIn(profile.heightCm).ft) : '',
    heightIn:
      profile?.heightCm != null ? String(cmToFtIn(profile.heightCm).inch) : '',
    startingWeight:
      profile?.startingWeightKg != null
        ? String(displayWeightValue(profile.startingWeightKg, weightUnit))
        : '',
    currentWeight:
      profile?.currentWeightKg != null
        ? String(displayWeightValue(profile.currentWeightKg, weightUnit))
        : '',
    activityLevel: (profile?.activityLevel ??
      'moderately-active') as ActivityLevel,
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

  const [form, setForm] = useState(buildForm);
  const initialFormRef = useRef(form);

  const isDirty = (() => {
    const initial = initialFormRef.current;
    return (
      form.firstName !== initial.firstName ||
      form.lastName !== initial.lastName ||
      form.email !== initial.email ||
      form.age !== initial.age ||
      form.gender !== initial.gender ||
      form.heightCm !== initial.heightCm ||
      form.heightFt !== initial.heightFt ||
      form.heightIn !== initial.heightIn ||
      form.startingWeight !== initial.startingWeight ||
      form.currentWeight !== initial.currentWeight ||
      form.activityLevel !== initial.activityLevel ||
      form.primaryGoal !== initial.primaryGoal ||
      form.bmr !== initial.bmr ||
      form.dailyCalories !== initial.dailyCalories ||
      form.proteinGrams !== initial.proteinGrams ||
      form.carbsGrams !== initial.carbsGrams ||
      form.fatsGrams !== initial.fatsGrams ||
      form.dietaryRestrictions !== initial.dietaryRestrictions ||
      form.coachNotes !== initial.coachNotes ||
      form.regularity !== initial.regularity ||
      form.averageCycleLength !== initial.averageCycleLength ||
      form.averagePeriodLength !== initial.averagePeriodLength ||
      form.menstrualNotes !== initial.menstrualNotes ||
      form.conditions.length !== initial.conditions.length ||
      form.conditions.some((c, i) => c !== initial.conditions[i])
    );
  })();

  if (!profile) {
    return (
      <div className="w-full max-w-3xl">
        <p className="text-text-secondary">Client not found.</p>
      </div>
    );
  }

  const toggleCondition = (c: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(c)
        ? prev.conditions.filter((x) => x !== c)
        : [...prev.conditions, c],
    }));
  };

  const handleSave = () => {
    const heightCm =
      heightUnit === 'cm'
        ? parseFloat(form.heightCm) || 0
        : ftInToCm(parseInt(form.heightFt) || 0, parseInt(form.heightIn) || 0);
    const startingWeightKg = fromDisplayWeight(
      parseFloat(form.startingWeight) || 0,
      weightUnit,
    );
    const currentWeightKg = fromDisplayWeight(
      parseFloat(form.currentWeight) || 0,
      weightUnit,
    );

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
    <div className="w-full max-w-3xl">
      <Link
        to={`/coach/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to {fullName(profile)}
      </Link>

      <PortalPageHeader
        title="Edit Profile"
        subtitle={`Update ${fullName(profile)}’s profile information. Changes are visible to the client except for your private notes.`}
      />

      <div className="space-y-6 sm:space-y-8">
        <SettingsSection
          headingId="basic-info-heading"
          title="Basic Information"
          icon={
            <User
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          description="Who they are and how to reach them."
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={FIRST_NAME_ID}
              title="First Name"
              layout="stacked"
            >
              <Input
                id={FIRST_NAME_ID}
                type="text"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </SettingsRow>

            <SettingsRow
              htmlFor={LAST_NAME_ID}
              title="Last Name"
              layout="stacked"
            >
              <Input
                id={LAST_NAME_ID}
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </SettingsRow>

            <SettingsRow
              htmlFor={EMAIL_ID}
              title="Email Address"
              layout="stacked"
            >
              <Input
                id={EMAIL_ID}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </SettingsRow>

            <SettingsRow title="Age & Gender" layout="stacked">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={AGE_ID}>Age</Label>
                  <Input
                    id={AGE_ID}
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={GENDER_ID}>Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) =>
                      setForm({ ...form, gender: v as Gender })
                    }
                  >
                    <SelectTrigger id={GENDER_ID} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="body-activity-heading"
          title="Body & Activity"
          icon={
            <Ruler
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          description="Measurements and training baseline."
        >
          <SettingsRows>
            <SettingsRow title="Height (cm)" layout="stacked">
              {heightUnit === 'cm' ? (
                <div className="max-w-xs space-y-2">
                  <Label htmlFor={HEIGHT_CM_ID} className="sr-only">
                    Height (cm)
                  </Label>
                  <Input
                    id={HEIGHT_CM_ID}
                    type="number"
                    inputMode="numeric"
                    value={form.heightCm}
                    onChange={(e) =>
                      setForm({ ...form, heightCm: e.target.value })
                    }
                    placeholder="165"
                  />
                </div>
              ) : (
                <div className="grid max-w-xs grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={HEIGHT_FT_ID}>Feet</Label>
                    <Input
                      id={HEIGHT_FT_ID}
                      type="number"
                      inputMode="numeric"
                      value={form.heightFt}
                      onChange={(e) =>
                        setForm({ ...form, heightFt: e.target.value })
                      }
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={HEIGHT_IN_ID}>Inches</Label>
                    <Input
                      id={HEIGHT_IN_ID}
                      type="number"
                      inputMode="numeric"
                      value={form.heightIn}
                      onChange={(e) =>
                        setForm({ ...form, heightIn: e.target.value })
                      }
                      placeholder="5"
                    />
                  </div>
                </div>
              )}
            </SettingsRow>

            <SettingsRow
              title={`Weight (${weightUnitLabel(weightUnit)})`}
              layout="stacked"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={STARTING_WEIGHT_ID}>Starting weight</Label>
                  <Input
                    id={STARTING_WEIGHT_ID}
                    type="number"
                    inputMode="decimal"
                    value={form.startingWeight}
                    onChange={(e) =>
                      setForm({ ...form, startingWeight: e.target.value })
                    }
                    placeholder={weightUnit === 'kg' ? '68' : '150'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={CURRENT_WEIGHT_ID}>Current weight</Label>
                  <Input
                    id={CURRENT_WEIGHT_ID}
                    type="number"
                    inputMode="decimal"
                    value={form.currentWeight}
                    onChange={(e) =>
                      setForm({ ...form, currentWeight: e.target.value })
                    }
                    placeholder={weightUnit === 'kg' ? '66' : '145'}
                  />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              htmlFor={ACTIVITY_LEVEL_ID}
              title="Activity Level"
              layout="stacked"
            >
              <Select
                value={form.activityLevel}
                onValueChange={(v) =>
                  setForm({ ...form, activityLevel: v as ActivityLevel })
                }
              >
                <SelectTrigger id={ACTIVITY_LEVEL_ID} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTIVITY_LEVEL_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SettingsRow>

            <SettingsRow
              htmlFor={PRIMARY_GOAL_ID}
              title="Primary Goal"
              layout="stacked"
            >
              <Input
                id={PRIMARY_GOAL_ID}
                type="text"
                value={form.primaryGoal}
                onChange={(e) =>
                  setForm({ ...form, primaryGoal: e.target.value })
                }
                placeholder="e.g. Body Recomposition"
              />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="nutrition-heading"
          title="Nutrition"
          icon={
            <Utensils
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          description="Daily targets and macro breakdown."
        >
          <SettingsRows>
            <SettingsRow title="Calorie Targets" layout="stacked">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={BMR_ID}>BMR (kcal)</Label>
                  <Input
                    id={BMR_ID}
                    type="number"
                    value={form.bmr}
                    onChange={(e) => setForm({ ...form, bmr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={DAILY_CALORIES_ID}>Daily target (kcal)</Label>
                  <Input
                    id={DAILY_CALORIES_ID}
                    type="number"
                    value={form.dailyCalories}
                    onChange={(e) =>
                      setForm({ ...form, dailyCalories: e.target.value })
                    }
                  />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow title="Macros" layout="stacked">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={PROTEIN_ID}>Protein (g)</Label>
                  <Input
                    id={PROTEIN_ID}
                    type="number"
                    value={form.proteinGrams}
                    onChange={(e) =>
                      setForm({ ...form, proteinGrams: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={CARBS_ID}>Carbs (g)</Label>
                  <Input
                    id={CARBS_ID}
                    type="number"
                    value={form.carbsGrams}
                    onChange={(e) =>
                      setForm({ ...form, carbsGrams: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={FATS_ID}>Fats (g)</Label>
                  <Input
                    id={FATS_ID}
                    type="number"
                    value={form.fatsGrams}
                    onChange={(e) =>
                      setForm({ ...form, fatsGrams: e.target.value })
                    }
                  />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              htmlFor={DIETARY_RESTRICTIONS_ID}
              title="Dietary Restrictions"
              layout="stacked"
            >
              <Input
                id={DIETARY_RESTRICTIONS_ID}
                type="text"
                value={form.dietaryRestrictions}
                onChange={(e) =>
                  setForm({ ...form, dietaryRestrictions: e.target.value })
                }
                placeholder="e.g. Dairy-free, Gluten sensitive"
              />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="menstrual-health-heading"
          title="Menstrual Health"
          icon={
            <Droplet
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          description="Cycle information and conditions the client has shared."
        >
          <SettingsRows>
            <SettingsRow
              labelId={REGULARITY_LABEL_ID}
              title="Cycle Regularity"
              layout="stacked"
            >
              <ChoiceGroup
                value={form.regularity}
                onValueChange={(v) =>
                  setForm({ ...form, regularity: v as CycleRegularity })
                }
                aria-labelledby={REGULARITY_LABEL_ID}
                className="w-full max-w-xs"
              >
                <ChoiceOption value="regular" aria-label="Regular">
                  Regular
                </ChoiceOption>
                <ChoiceOption value="irregular" aria-label="Irregular">
                  Irregular
                </ChoiceOption>
              </ChoiceGroup>
            </SettingsRow>

            <SettingsRow title="Cycle Length" layout="stacked">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={CYCLE_LENGTH_ID}>
                    Avg cycle length (days)
                  </Label>
                  <Input
                    id={CYCLE_LENGTH_ID}
                    type="number"
                    value={form.averageCycleLength}
                    onChange={(e) =>
                      setForm({ ...form, averageCycleLength: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={PERIOD_LENGTH_ID}>
                    Avg period length (days)
                  </Label>
                  <Input
                    id={PERIOD_LENGTH_ID}
                    type="number"
                    value={form.averagePeriodLength}
                    onChange={(e) =>
                      setForm({ ...form, averagePeriodLength: e.target.value })
                    }
                  />
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              labelId={CONDITIONS_LABEL_ID}
              title="Conditions"
              layout="stacked"
            >
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby={CONDITIONS_LABEL_ID}
              >
                {CYCLE_CONDITIONS.map((c) => (
                  <ToggleChip
                    key={c}
                    pressed={form.conditions.includes(c)}
                    onPressedChange={() => toggleCondition(c)}
                  >
                    {c}
                  </ToggleChip>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow
              htmlFor={MENSTRUAL_NOTES_ID}
              title="Cycle Notes"
              layout="stacked"
            >
              <Textarea
                id={MENSTRUAL_NOTES_ID}
                value={form.menstrualNotes}
                onChange={(e) =>
                  setForm({ ...form, menstrualNotes: e.target.value })
                }
                rows={3}
              />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>

        <SettingsSection
          headingId="coach-notes-heading"
          title="Coach Notes"
          icon={
            <Lock
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          description="Private notes visible only to you."
        >
          <SettingsRows>
            <SettingsRow
              htmlFor={COACH_NOTES_ID}
              title="Notes"
              layout="stacked"
            >
              <Textarea
                id={COACH_NOTES_ID}
                value={form.coachNotes}
                onChange={(e) =>
                  setForm({ ...form, coachNotes: e.target.value })
                }
                rows={4}
                placeholder="Observations and reminders, not visible to the client"
              />
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      </div>

      {/* Footer actions */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Link
          to={`/coach/clients/${clientId}`}
          className={buttonVariants({ variant: 'ghost', size: 'md' })}
        >
          Cancel
        </Link>
        <Button
          onClick={handleSave}
          variant="primary"
          size="md"
          disabled={!isDirty}
        >
          <Check size={16} />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
