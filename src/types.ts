export type UserRole = 'runner' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  photoURL: string;
  bannerURL?: string;
  city?: string;
  role: UserRole;
  createdAt: string;
  showPublicly: boolean;
}

export type RunType = 'Club run' | 'Personal';
export type RunStatus = 'pending' | 'approved' | 'rejected';

export interface RunEntry {
  id: string;
  uid: string;
  date: string; // YYYY-MM-DD
  km: number;
  type: RunType;
  addedBy: string;
  createdAt: string;
  status?: RunStatus;
  durationSeconds?: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface EventFee {
  male: number;
  female: number;
  couple: number;
}

export interface EventActivity {
  name: string;
  detail?: string;
}

export type EventStatus = 'upcoming' | 'past' | 'cancelled';

export interface ClubEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  venueName?: string;
  venueMapUrl?: string;
  bannerUrl?: string;
  intro?: string; // max 240 chars
  mainRunLabel?: string; // e.g. "3K community run"
  activities?: EventActivity[];
  specialMentionTitle?: string;
  specialMentionText?: string;
  specialMentionLogoUrl?: string;
  safetyNote?: string;
  feeText?: string; // e.g. "Free" or "Rs 199"
  featured?: boolean;
  city?: string;
  distanceKm: number;
  fee: EventFee;
  perks: string[];
  registrationUrl: string;
  status?: EventStatus;
  description?: string;
}

export interface CollabEntry {
  id: string;
  partnerName: string;
  logoUrl?: string;
  title: string;
  dateLabel?: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export interface AnnouncementEntry {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: string;
  createdBy: string;
}

export interface VoiceQuoteEntry {
  id: string;
  quote: string;
  runnerName: string;
  tag?: string;
  createdAt: string;
}

export interface MemoryAlbumEntry {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  coverPhoto: string;
  link: string;
  createdAt: string;
}

export interface PartnerEntry {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  createdAt: string;
}

export interface ProfileReportEntry {
  id: string;
  targetUid: string;
  targetName: string;
  reason: string;
  reportedBy: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

export interface RewardEntry {
  id: string;
  month: string; // e.g. "2026-11"
  rank: 1 | 2 | 3;
  rewardName: string;
  claimed: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  instagramUrl: string;
  photoURL?: string;
}

export interface SiteSettings {
  registrationUrl: string;
  whatsappUrl: string;
  instagramUrl?: string;
  teamMembers?: TeamMember[];
  contactPhones?: string[];
}

export interface MilestoneBadge {
  km: 10 | 25 | 50 | 100;
  label: string;
  hindiSub: string;
  unlocked: boolean;
}

export interface RunnerComputedStats {
  user: UserProfile;
  totalKm: number;
  monthlyKm: number;
  runsCount: number;
  monthlyRunsCount: number;
  allTimeRank: number;
  monthlyRank: number;
  streakWeeks: number;
  badges: MilestoneBadge[];
  nextBadge: {
    targetKm: number;
    remainingKm: number;
    progressPct: number;
  } | null;
  recentRuns: RunEntry[];
}
