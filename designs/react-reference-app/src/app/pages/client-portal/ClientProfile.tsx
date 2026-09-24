import { useRef, ChangeEvent } from 'react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { User, Camera, Droplet, Ruler, Trash2, Utensils } from 'lucide-react';
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
import { Reading } from '../../components/Reading';
import { LABEL_CLASS, VALUE_LG_CLASS } from '../../components/typography';
import { useAppState } from '../../context/AppContext';
import { getInitials } from '../../utils/clientHelpers';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { cardVariants } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function ClientProfile() {
  const { clientProfile, updateProfile } = useClientProfile();
  const { clientProfile: menstrualProfile } = useCycle();
  const { weightUnit, heightUnit } = useUnitPreferences();
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';
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
        subtitle="Your coach keeps this up to date. Mention any changes at your next check-in."
      />

      <section
        aria-labelledby="profile-identity-heading"
        className={cn(
          cardVariants({ variant: 'panel' }),
          'mb-6 flex flex-col items-center gap-6 p-6 sm:flex-row lg:mb-8 lg:p-8',
        )}
      >
        <Avatar size="lg">
          {clientProfile.avatarUrl && (
            <AvatarImage
              src={clientProfile.avatarUrl}
              alt={`${fullName(clientProfile)}'s profile picture`}
            />
          )}
          <AvatarFallback>
            {getInitials(fullName(clientProfile))}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h2 id="profile-identity-heading" className={VALUE_LG_CLASS}>
            {fullName(clientProfile)}
          </h2>
          <p className="mt-1 mb-4 text-sm text-text-secondary">
            {clientProfile.email}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            {clientProfile.avatarUrl && (
              <Button
                type="button"
                onClick={handleRemoveAvatar}
                variant="ghost"
                size="sm"
              >
                <Trash2 aria-hidden="true" size={16} />
                Remove
              </Button>
            )}
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Camera aria-hidden="true" size={16} />
              {clientProfile.avatarUrl ? 'Change picture' : 'Upload picture'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Basic info */}
        <ClientWidget
          eyebrow="About you"
          icon={
            <User
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="about-you-heading"
        >
          <div className="space-y-4">
            <Reading label="Full Name" value={fullName(clientProfile)} />
            <Reading label="Email" value={clientProfile.email} />
            <Reading label="Age" value={`${clientProfile.age} years`} />
            <Reading label="Gender" value={clientProfile.gender} />
          </div>
        </ClientWidget>

        {/* Body metrics */}
        <ClientWidget
          eyebrow="Body & goals"
          icon={
            <Ruler
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="body-goals-heading"
        >
          <div className="space-y-4">
            <Reading
              label="Height"
              value={formatHeight(clientProfile.heightCm, heightUnit)}
            />
            <Reading
              label="Weight"
              value={`${formatBodyWeight(clientProfile.startingWeightKg, weightUnit)} → ${formatBodyWeight(clientProfile.currentWeightKg, weightUnit)}`}
            />
            <Reading
              label="Activity Level"
              value={ACTIVITY_LEVEL_LABELS[clientProfile.activityLevel]}
            />
            <Reading label="Primary Goal" value={clientProfile.primaryGoal} />
          </div>
        </ClientWidget>

        {isPostMvp && (
          <ClientWidget
            eyebrow="Nutrition"
            icon={
              <Utensils
                aria-hidden="true"
                className="text-brand-secondary"
                size={18}
              />
            }
            headingId="profile-nutrition-heading"
          >
            <div className="space-y-4">
              <Reading
                label="BMR"
                value={`${clientProfile.bmr.toLocaleString()} kcal`}
              />
              <Reading
                label="Daily Target"
                value={`${clientProfile.dailyCalories.toLocaleString()} kcal`}
              />
              <Reading
                label="Macros"
                value={`${clientProfile.proteinGrams}g Protein · ${clientProfile.carbsGrams}g Carbs · ${clientProfile.fatsGrams}g Fats`}
              />
              <Reading
                label="Dietary restrictions"
                value={clientProfile.dietaryRestrictions || 'None on file'}
              />
            </div>
          </ClientWidget>
        )}

        {/* Menstrual profile */}
        {menstrualProfile && (
          <ClientWidget
            eyebrow="Menstrual health"
            icon={
              <Droplet
                aria-hidden="true"
                className="text-brand-secondary"
                size={18}
              />
            }
            headingId="menstrual-health-heading"
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Reading
                label="Cycle"
                value={
                  menstrualProfile.regularity === 'regular'
                    ? 'Regular'
                    : 'Irregular'
                }
              />
              <Reading
                label="Average Cycle Length"
                value={`${menstrualProfile.averageCycleLength} days`}
              />
              <Reading
                label="Average Period Length"
                value={`${menstrualProfile.averagePeriodLength} days`}
              />
              <Reading
                label="Conditions"
                value={
                  menstrualProfile.conditions.length > 0
                    ? menstrualProfile.conditions.join(', ')
                    : 'None reported'
                }
              />
            </div>
            {menstrualProfile.notes && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className={cn(LABEL_CLASS, 'mb-2')}>Your notes</p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {menstrualProfile.notes}
                </p>
              </div>
            )}
          </ClientWidget>
        )}
      </div>

      <MeasurementsSection />
    </div>
  );
}
