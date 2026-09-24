import { useState, useRef, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, Trash2, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { getInitials } from '../../utils/clientHelpers';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '../../components/ui/avatar';
import { cardVariants } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { LABEL_CLASS } from '../../components/typography';
import {
  SettingsSection,
  SettingsRows,
  SettingsRow,
} from '../../components/SettingsSection';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const NAME_FIELD_ID = 'coach-profile-name';
const BIO_FIELD_ID = 'coach-profile-bio';

export function EditCoachProfile() {
  const navigate = useNavigate();
  const { coachProfile, updateCoachProfile } = useCoachProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: coachProfile.name,
    bio: coachProfile.bio,
  });

  const isDirty =
    form.name !== coachProfile.name || form.bio !== coachProfile.bio;

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
      updateCoachProfile({ avatarUrl: reader.result as string });
      toast.success('Profile picture updated');
    };
    reader.onerror = () => toast.error('Could not read that image');
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    updateCoachProfile({ avatarUrl: undefined });
    toast.success('Profile picture removed');
  };

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

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          cardVariants({ variant: 'panel' }),
          'p-6 lg:p-8 mb-6 lg:mb-8 flex flex-col sm:flex-row items-center gap-6',
        )}
      >
        <div className="shrink-0">
          <Avatar className="size-24 border border-border">
            {coachProfile.avatarUrl && (
              <AvatarImage
                src={coachProfile.avatarUrl}
                alt={`${coachProfile.name}'s profile picture`}
              />
            )}
            <AvatarFallback className="text-2xl">
              {getInitials(coachProfile.name) || (
                <User size={40} strokeWidth={1.5} />
              )}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className={cn(LABEL_CLASS, 'mb-1')}>Profile Picture</p>
          <h2 className="font-serif text-xl lg:text-2xl text-text-primary mb-4">
            {coachProfile.name}
          </h2>

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
              variant="primary"
              className="shadow-card"
            >
              <Camera size={16} />
              {coachProfile.avatarUrl ? 'Change picture' : 'Upload picture'}
            </Button>
            {coachProfile.avatarUrl && (
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

      {/* Details */}
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
