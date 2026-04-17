import { useState, useRef, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, Trash2, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { useCoachProfile } from '../../context/CoachProfileContext';
import { getInitials } from '../../utils/clientHelpers';

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
    <div className="w-full max-w-3xl mx-auto pb-12">
      <Link
        to="/coach"
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-[#121212] mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
          My Profile
        </h1>
        <p className="text-neutral-500 font-medium">
          Update how you appear to your clients across the platform.
        </p>
      </header>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 mb-6 lg:mb-8 flex flex-col sm:flex-row items-center gap-6"
      >
        <div className="shrink-0">
          {coachProfile.avatarUrl ? (
            <img
              src={coachProfile.avatarUrl}
              alt={`${coachProfile.name}'s profile picture`}
              className="w-24 h-24 rounded-full object-cover border border-neutral-100"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#C81D6B]/10 text-[#C81D6B] flex items-center justify-center font-serif font-semibold text-2xl">
              {getInitials(coachProfile.name) || <User size={40} strokeWidth={1.5} />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Profile Picture</p>
          <h2 className="font-serif text-xl lg:text-2xl text-[#121212] mb-4">{coachProfile.name}</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-[#121212] text-white text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2 shadow-md"
            >
              <Camera size={16} />
              {coachProfile.avatarUrl ? 'Change picture' : 'Upload picture'}
            </button>
            {coachProfile.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-600 text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Remove
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Details */}
      <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-[#121212] mb-2">Details</h2>
          <p className="text-sm text-neutral-500">
            Your name and bio appear to clients in messages and on the platform.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
            Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border-b border-neutral-200 py-3 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={e => setForm({ ...form, bio: e.target.value })}
            rows={5}
            placeholder="A short bio that clients can read on your profile."
            className="w-full border border-neutral-200 rounded-xl p-4 focus:outline-none focus:border-[#C81D6B] transition-colors text-sm resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-end gap-3">
        <Link
          to="/coach"
          className="px-6 py-3 text-sm font-semibold text-neutral-500 hover:text-[#121212] transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-[#C81D6B] text-white text-sm font-semibold rounded-xl hover:bg-[#a31556] transition-colors shadow-md flex items-center gap-2"
        >
          <Check size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
