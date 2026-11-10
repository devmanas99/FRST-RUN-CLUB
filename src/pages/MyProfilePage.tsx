import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import { Avatar } from '../components/Avatar';
import {
  CountUpKm,
  DoodleFlame,
  ProfileBannerPattern,
} from '../components/Doodles';
import { ImageCropModal } from '../components/ImageCropModal';
import {
  cropAndCompressImage,
  deleteProfileImageFromStorage,
  PixelCropArea,
  uploadCroppedProfileImage,
  validateImageFile,
} from '../lib/firebase';

export function formatMemberSince(iso: string): string {
  if (!iso) return 'Member since November 2026';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Member since 2026';
  const monthYear = d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return `Member since ${monthYear}`;
}

export const MyProfilePage: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    getRunnerStats,
    updateMyProfile,
    updateMyProfileMedia,
    signOut,
    deleteMyAccount,
    runs,
  } = useClub();
  const navigate = useNavigate();

  // Edit profile drawer/panel state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showPublicly, setShowPublicly] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Image upload & crop state
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [cropKind, setCropKind] = useState<'avatar' | 'banner' | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cropError, setCropError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName);
      setBio((currentUser.bio || '').slice(0, 120));
      setShowPublicly(currentUser.showPublicly);
    }
  }, [currentUser]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  if (!currentUser) {
    return (
      <div className="px-4 py-8 space-y-4">
        <h1 className="font-display text-[34px] text-[var(--text)]">Profile</h1>
        <p className="text-[16px] text-[var(--muted)]">
          Sign in to view your profile, badges, and run history.
        </p>
        <Link to="/login" className="w-full btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const stats = getRunnerStats(currentUser.uid);
  const myRuns = runs.filter((r) => r.uid === currentUser.uid);
  const totalKm = stats?.totalKm ?? 0;
  const runsCount = stats?.runsCount ?? 0;
  const streakWeeks = stats?.streakWeeks ?? 0;
  const isUnranked = !stats || stats.totalKm <= 0 || stats.allTimeRank <= 0;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'avatar' | 'banner'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      showNotice('error', validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropKind(kind);
    setCropImageSrc(objectUrl);
    setCropError(null);
    setUploadProgress(0);
  };

  const closeCropModal = () => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
    setCropKind(null);
    setCropError(null);
    setUploadProgress(0);
  };

  const handleSaveCroppedImage = async (croppedPixels: PixelCropArea) => {
    if (!cropImageSrc || !cropKind || !currentUser) return;
    setUploadingMedia(true);
    setCropError(null);
    setUploadProgress(5);

    try {
      const compressedBlob = await cropAndCompressImage(
        cropImageSrc,
        croppedPixels,
        cropKind
      );
      const downloadUrl = await uploadCroppedProfileImage(
        currentUser.uid,
        cropKind,
        compressedBlob,
        (pct) => setUploadProgress(pct)
      );

      if (cropKind === 'avatar') {
        await updateMyProfileMedia({ photoURL: downloadUrl });
        showNotice('success', 'Profile photo updated.');
      } else {
        await updateMyProfileMedia({ bannerURL: downloadUrl });
        showNotice('success', 'Profile banner updated.');
      }

      closeCropModal();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not upload image. Please check your connection and try again.';
      setCropError(msg);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser.photoURL) return;
    try {
      await deleteProfileImageFromStorage(currentUser.uid, 'avatar');
      await updateMyProfileMedia({ photoURL: '' });
      showNotice('success', 'Profile photo removed.');
    } catch {
      showNotice('error', 'Could not remove profile photo.');
    }
  };

  const handleRemoveBanner = async () => {
    if (!currentUser.bannerURL) return;
    try {
      await deleteProfileImageFromStorage(currentUser.uid, 'banner');
      await updateMyProfileMedia({ bannerURL: '' });
      showNotice('success', 'Banner removed.');
    } catch {
      showNotice('error', 'Could not remove banner.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateMyProfile({
        displayName,
        bio: bio.slice(0, 120),
        photoURL: currentUser.photoURL || '',
        bannerURL: currentUser.bannerURL,
        showPublicly,
      });
      setIsEditingProfile(false);
      showNotice('success', 'Profile saved.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    await deleteMyAccount();
    navigate('/login');
  };

  return (
    <div className="pb-10 overflow-x-hidden">
      {/* Hidden file inputs for photo & banner */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileChange(e, 'avatar')}
        className="hidden"
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFileChange(e, 'banner')}
        className="hidden"
      />

      {/* Crop Modal */}
      {cropImageSrc && cropKind && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          kind={cropKind}
          uploading={uploadingMedia}
          progress={uploadProgress}
          errorMessage={cropError}
          onCancel={closeCropModal}
          onSave={handleSaveCroppedImage}
        />
      )}

      {/* 1. Banner image, full width, 3:1 ratio (about 140px tall) */}
      <div className="relative w-full aspect-[3/1] min-h-[140px] max-h-[160px] bg-[var(--card)] border-b border-[var(--divider)] overflow-hidden">
        {currentUser.bannerURL ? (
          <img
            src={currentUser.bannerURL}
            alt={`${currentUser.displayName} profile banner`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        ) : (
          <ProfileBannerPattern />
        )}

        {/* Small "Change banner" button on the banner */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {currentUser.bannerURL && (
            <button
              type="button"
              onClick={handleRemoveBanner}
              className="h-8 px-2.5 rounded-[8px] bg-[var(--bg)]/90 text-[var(--text)] border border-[var(--divider)] text-[12px] font-medium cursor-pointer"
            >
              Remove banner
            </button>
          )}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="h-8 px-3 rounded-[8px] bg-[var(--bg)]/90 text-[var(--text)] border border-[var(--divider)] text-[12px] font-medium cursor-pointer"
          >
            Change banner
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="px-4 space-y-8">
        {/* 2. Round profile photo (88px) overlapping bottom of banner + Name, role chip, bio, member since */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 -mt-11 relative z-10">
            <div className="relative inline-block">
              <Avatar
                name={currentUser.displayName}
                photoURL={currentUser.photoURL}
                size="2xl"
                className="ring-[3px] ring-[var(--bg)]"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--accent)] text-[var(--on-accent)] ring-2 ring-[var(--bg)] flex items-center justify-center cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {currentUser.photoURL && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-[13px] font-medium text-[var(--muted)] underline cursor-pointer pb-1"
              >
                Remove photo
              </button>
            )}
          </div>

          {statusMessage && (
            <div
              role="status"
              className={`text-[13px] font-medium ${
                statusMessage.type === 'error'
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--text)]'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-[28px] text-[var(--text)] leading-none">
                {currentUser.displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full border border-[var(--divider)] bg-[var(--card)] text-[12px] font-medium text-[var(--muted)]">
                {currentUser.role === 'admin' ? 'Admin' : 'Runner'}
              </span>
            </div>

            <p className="text-[16px] text-[var(--text)] leading-snug">
              {currentUser.bio || 'Running with FRST Run Club in Rewa.'}
            </p>

            <p className="text-[13px] text-[var(--muted)]">
              {formatMemberSince(currentUser.createdAt)}
            </p>
          </div>

          {/* On My Profile only: Edit profile button, and Admin button (admins only) */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingProfile((v) => !v)}
              className="flex-1 btn-primary"
            >
              {isEditingProfile ? 'Close edit' : 'Edit profile'}
            </button>
            {isAdmin && (
              <Link to="/admin" className="px-5 btn-secondary">
                Admin
              </Link>
            )}
          </div>

          {/* Inline Edit Profile Drawer when toggled */}
          {isEditingProfile && (
            <form
              onSubmit={handleSaveProfile}
              className="club-card p-4 space-y-4 mt-3"
            >
              <div>
                <label
                  htmlFor="edit-prof-name"
                  className="block text-[13px] text-[var(--muted)] mb-1"
                >
                  Name
                </label>
                <input
                  id="edit-prof-name"
                  type="text"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="edit-prof-bio"
                    className="text-[13px] text-[var(--muted)]"
                  >
                    One-line bio
                  </label>
                  <span className="text-[12px] text-[var(--muted)] tabular-nums">
                    {bio.length}/120
                  </span>
                </div>
                <input
                  id="edit-prof-bio"
                  type="text"
                  maxLength={120}
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 120))}
                  placeholder="Sunday 5K runner in Rewa"
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div className="py-2.5 border-y border-[var(--divider)] flex items-center justify-between gap-3">
                <label
                  htmlFor="edit-prof-public"
                  className="text-[15px] text-[var(--text)] cursor-pointer"
                >
                  Show me on the public leaderboard
                </label>
                <button
                  id="edit-prof-public"
                  type="button"
                  role="switch"
                  aria-checked={showPublicly}
                  onClick={() => setShowPublicly((v) => !v)}
                  className={`w-12 h-7 rounded-full border border-[var(--divider)] p-0.5 cursor-pointer shrink-0 transition-colors ${
                    showPublicly ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full transition-transform ${
                      showPublicly
                        ? 'translate-x-5 bg-[var(--on-accent)]'
                        : 'translate-x-0 bg-[var(--muted)]'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 btn-primary"
                >
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 3. Stats as a row of 3 tiles: Total km, Runs, Rank + Streak tile with flame doodle */}
        <section aria-label="Runner statistics" className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Total km</span>
              <span className="font-display text-[26px] text-[var(--accent)] tabular-nums leading-tight pt-1">
                <CountUpKm value={totalKm} decimals={1} />
              </span>
            </div>

            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Runs</span>
              <span className="font-display text-[26px] text-[var(--text)] tabular-nums leading-tight pt-1">
                {runsCount}
              </span>
            </div>

            <div className="club-card p-3.5 flex flex-col justify-between">
              <span className="text-[13px] text-[var(--muted)]">Rank</span>
              {isUnranked ? (
                <span className="font-display text-[20px] text-[var(--muted)] leading-tight pt-1.5">
                  Unranked
                </span>
              ) : (
                <span className="font-display text-[26px] text-[var(--accent)] tabular-nums leading-tight pt-1">
                  #{stats.allTimeRank}
                </span>
              )}
            </div>
          </div>

          {/* Streak tile (weeks in a row with a run) with small flame doodle */}
          <div className="club-card px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DoodleFlame className="w-5 h-6" />
              <div>
                <div className="text-[15px] font-medium text-[var(--text)]">
                  Weekly streak
                </div>
                <div className="text-[13px] text-[var(--muted)]">
                  Weeks in a row with a run
                </div>
              </div>
            </div>
            <div className="font-display text-[24px] text-[var(--accent)] tabular-nums">
              {streakWeeks} {streakWeeks === 1 ? 'wk' : 'wks'}
            </div>
          </div>
        </section>

        {/* 4. Badges row (10, 25, 50, 100 km) */}
        {stats && (
          <section aria-label="Milestone badges" className="space-y-3">
            <h2 className="font-display text-[22px] text-[var(--text)] leading-none">
              Badges
            </h2>

            <div className="grid grid-cols-4 gap-2">
              {stats.badges.map((b) => {
                const kmToGo = Math.max(0, Number((b.km - totalKm).toFixed(1)));
                return (
                  <div
                    key={b.km}
                    className={`rounded-[14px] p-2.5 border text-center flex flex-col justify-between min-h-[82px] ${
                      b.unlocked
                        ? 'bg-[var(--card)] border-[var(--accent)] text-[var(--accent)]'
                        : 'bg-[var(--card)] border-[var(--divider)] text-[var(--muted)] opacity-65'
                    }`}
                  >
                    <span className="font-display text-[20px] leading-none tabular-nums">
                      {b.km} km
                    </span>
                    <span className="text-[11px] leading-tight pt-2 block tabular-nums">
                      {b.unlocked ? 'Earned' : `${kmToGo} km to go`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Recent runs as a simple list with thin dividers */}
        <section aria-label="Recent runs" className="space-y-3">
          <h2 className="font-display text-[22px] text-[var(--text)] leading-none">
            Recent runs
          </h2>

          {myRuns.length === 0 ? (
            <p className="text-[16px] text-[var(--muted)] py-3 border-y border-[var(--divider)]">
              No runs yet
            </p>
          ) : (
            <div className="divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
              {myRuns.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[16px] text-[var(--text)] tabular-nums">
                      {r.date}
                    </span>
                    <span className="text-[13px] text-[var(--muted)]">
                      · {r.type}
                    </span>
                    {r.status === 'pending' && (
                      <span className="text-[13px] font-medium text-[var(--accent)]">
                        · Pending
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="text-[13px] text-[var(--muted)]">
                        · Rejected
                      </span>
                    )}
                  </div>
                  <span className="font-display text-[20px] text-[var(--accent)] tabular-nums shrink-0">
                    {r.km} km
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Account actions (My Profile only) */}
        <section className="pt-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-secondary-sm"
            >
              Log out
            </button>

            {!confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[13px] text-[var(--muted)] underline cursor-pointer"
              >
                Delete my account
              </button>
            )}
          </div>

          {confirmDelete && (
            <div className="club-card p-4 space-y-3">
              <div className="font-display text-[22px] text-[var(--text)]">
                Delete your account?
              </div>
              <p className="text-[16px] text-[var(--muted)]">
                Your profile and run history will be permanently removed.
              </p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="btn-secondary-sm text-[var(--accent)]"
                >
                  Yes, delete my account
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[13px] font-semibold text-[var(--muted)] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
