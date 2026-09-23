import { useState, useRef, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, Trash2, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { getInitials } from '../../utils/clientHelpers';
import { Button, buttonVariants } from '../../components/ui/button';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function EditCoachProfile() {
  const navigate = useNavigate();
  const { coachProfile, updateCoachProfile } = useCoachProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: coachProfile.name,
    bio: coachProfile.bio,
  });

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
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors"
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
        className="bg-card p-6 lg:p-8 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 mb-6 lg:mb-8 flex flex-col sm:flex-row items-center gap-6"
      >
        <div className="shrink-0">
          {coachProfile.avatarUrl ? (
            <img
              src={coachProfile.avatarUrl}
              alt={`${coachProfile.name}'s profile picture`}
              className="w-24 h-24 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-soft text-brand flex items-center justify-center font-serif font-semibold text-2xl">
              {getInitials(coachProfile.name) || (
                <User size={40} strokeWidth={1.5} />
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
            Profile Picture
          </p>
          <h2 className="font-serif text-xl lg:text-2xl text-foreground mb-4">
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
              variant="inverted"
              className="shadow-md"
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
      <div className="bg-card p-8 lg:p-10 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-foreground mb-2">Details</h2>
          <p className="text-sm text-muted-foreground">
            Your name and bio appear to clients in messages and on the platform.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 border-b border-border rounded-field py-3 focus:outline-none transition-colors text-sm"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={5}
            placeholder="A short bio that clients can read on your profile."
            className="w-full border border-border rounded-control p-4 focus:outline-none transition-colors text-sm resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Link
          to="/coach"
          className={buttonVariants({ variant: 'ghost', size: 'lg' })}
        >
          Cancel
        </Link>
        <Button
          onClick={handleSave}
          variant="brand"
          size="lg"
          className="shadow-md"
        >
          <Check size={16} />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
