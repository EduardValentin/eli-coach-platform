import { useRef, ChangeEvent } from 'react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import { User, FileText, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { showUndoToast } from '../../utils/showUndoToast';
import {
  useClientProfile,
  fullName,
  ACTIVITY_LEVEL_LABELS,
} from '../../context/ClientProfileContext';
import { useCycle } from '../../context/CycleContext';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { formatHeight, formatBodyWeight } from '../../utils/units';
import { MeasurementsSection } from '../../components/client-portal/MeasurementsSection';
import { ClientWidget } from '../../components/client-portal/ClientWidget';
import { SectionEyebrow } from '../../components/SectionEyebrow';
import { Button } from '../../components/ui/button';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ClientProfile() {
  const { clientProfile, updateProfile } = useClientProfile();
  const { clientProfile: menstrualProfile } = useCycle();
  const { weightUnit, heightUnit } = useUnitPreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Please upload an image smaller than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateProfile('client-1', { avatarUrl: reader.result as string });
      toast.success('Profile picture updated');
    };
    reader.onerror = () => toast.error('Could not read that image');
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const previousUrl = clientProfile?.avatarUrl;
    updateProfile('client-1', { avatarUrl: undefined });
    showUndoToast({
      message: 'Profile picture removed',
      onUndo: () => updateProfile('client-1', { avatarUrl: previousUrl }),
    });
  };

  if (!clientProfile) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <p className="text-text-secondary">No profile data available.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <PortalPageHeader
        title="Your Profile"
        subtitle="Review the information your coach has set up for you. Reach out in chat if anything needs updating."
      />

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="profile-picture-heading"
        className="bg-white p-6 lg:p-8 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 mb-6 lg:mb-8 flex flex-col sm:flex-row items-center gap-6"
      >
        <div className="relative shrink-0">
          {clientProfile.avatarUrl ? (
            <img
              src={clientProfile.avatarUrl}
              alt={`${fullName(clientProfile)}'s profile picture`}
              className="w-24 h-24 rounded-full object-cover border border-neutral-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <User size={44} strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <SectionEyebrow as="h2" className="mb-1" id="profile-picture-heading">
            Profile Picture
          </SectionEyebrow>
          <p className="font-serif text-xl lg:text-2xl text-text-primary mb-4">
            {fullName(clientProfile)}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="default"
            >
              <Camera size={16} />
              {clientProfile.avatarUrl ? 'Change picture' : 'Upload picture'}
            </Button>
            {clientProfile.avatarUrl && (
              <Button
                type="button"
                onClick={handleRemoveAvatar}
                variant="outline"
              >
                <Trash2 size={16} />
                Remove
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Basic info */}
        <ClientWidget eyebrow="About you" headingId="about-you-heading">
          <ProfileField label="Full Name" value={fullName(clientProfile)} />
          <ProfileField label="Email" value={clientProfile.email} />
          <ProfileField label="Age" value={`${clientProfile.age} years`} />
          <ProfileField label="Gender" value={clientProfile.gender} />
        </ClientWidget>

        {/* Body metrics */}
        <ClientWidget eyebrow="Body & goals" headingId="body-goals-heading">
          <ProfileField
            label="Height"
            value={formatHeight(clientProfile.heightCm, heightUnit)}
          />
          <ProfileField
            label="Starting Weight / Current"
            value={`${formatBodyWeight(clientProfile.startingWeightKg, weightUnit)} / ${formatBodyWeight(clientProfile.currentWeightKg, weightUnit)}`}
          />
          <ProfileField
            label="Activity Level"
            value={ACTIVITY_LEVEL_LABELS[clientProfile.activityLevel]}
          />
          <ProfileField
            label="Primary Goal"
            value={clientProfile.primaryGoal}
          />
        </ClientWidget>

        {/* Nutrition */}
        <ClientWidget eyebrow="Nutrition" headingId="profile-nutrition-heading">
          <ProfileField
            label="BMR"
            value={`${clientProfile.bmr.toLocaleString()} kcal`}
          />
          <ProfileField
            label="Daily Target"
            value={`${clientProfile.dailyCalories.toLocaleString()} kcal`}
          />
          <ProfileField
            label="Macros"
            value={`${clientProfile.proteinGrams}g Protein · ${clientProfile.carbsGrams}g Carbs · ${clientProfile.fatsGrams}g Fats`}
          />
        </ClientWidget>

        {/* Dietary restrictions */}
        <ClientWidget
          eyebrow="Dietary restrictions"
          headingId="dietary-restrictions-heading"
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            {clientProfile.dietaryRestrictions || 'None on file.'}
          </p>
        </ClientWidget>

        {/* Menstrual profile */}
        {menstrualProfile && (
          <ClientWidget
            eyebrow="Menstrual health"
            headingId="menstrual-health-heading"
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <ProfileField
                label="Cycle"
                value={
                  menstrualProfile.regularity === 'regular'
                    ? 'Regular'
                    : 'Irregular'
                }
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
                value={
                  menstrualProfile.conditions.length > 0
                    ? menstrualProfile.conditions.join(', ')
                    : 'None reported'
                }
              />
            </div>
            {menstrualProfile.notes && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">
                  Your Notes
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {menstrualProfile.notes}
                </p>
              </div>
            )}
          </ClientWidget>
        )}
      </div>

      <MeasurementsSection />

      <div className="mt-8 p-5 rounded-card bg-brand/5 border border-brand/10 flex items-start gap-3">
        <FileText size={18} className="text-brand mt-0.5 shrink-0" />
        <p className="text-sm text-text-secondary leading-relaxed">
          Something out of date? Message your coach and she&apos;ll update your
          profile.
        </p>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 px-3 border-b border-neutral-100 rounded-field last:border-b-0 last:pb-0">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="font-semibold text-sm text-text-primary">{value}</p>
    </div>
  );
}
