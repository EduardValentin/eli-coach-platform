import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarField } from '../../components/AvatarField';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  SettingsSection,
  SettingsRows,
  SettingsRow,
} from '../../components/SettingsSection';

const NAME_FIELD_ID = 'coach-profile-name';
const BIO_FIELD_ID = 'coach-profile-bio';

export function EditCoachProfile() {
  const navigate = useNavigate();
  const { coachProfile, updateCoachProfile } = useCoachProfile();

  const [form, setForm] = useState({
    name: coachProfile.name,
    bio: coachProfile.bio,
  });

  const isDirty =
    form.name !== coachProfile.name || form.bio !== coachProfile.bio;

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    updateCoachProfile({ name: form.name.trim(), bio: form.bio });
    toast.success('Profile updated');
    navigate('/coach');
  };

  return (
    <div className="w-full max-w-3xl">
      <Link
        to="/coach"
        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <PortalPageHeader
        title="My Profile"
        subtitle="Update how you appear to your clients across the platform."
      />

      <AvatarField
        name={coachProfile.name}
        detail="Profile picture"
        avatarUrl={coachProfile.avatarUrl ?? null}
        onChange={async (avatarUrl) => updateCoachProfile({ avatarUrl: avatarUrl ?? undefined })}
      />

      <SettingsSection
        headingId="coach-profile-details-heading"
        title="Details"
        description="Your name and bio appear to clients in messages and on the platform."
        footer={
          <>
            <Link
              to="/coach"
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
          </>
        }
      >
        <SettingsRows>
          <SettingsRow htmlFor={NAME_FIELD_ID} title="Name" layout="stacked">
            <Input
              id={NAME_FIELD_ID}
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </SettingsRow>

          <SettingsRow htmlFor={BIO_FIELD_ID} title="Bio" layout="stacked">
            <Textarea
              id={BIO_FIELD_ID}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={5}
              placeholder="A short bio that clients can read on your profile."
            />
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>
    </div>
  );
}
