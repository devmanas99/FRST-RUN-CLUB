import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isFirebaseConfigured,
  OperationType,
} from '../lib/firebase';
import {
  AnnouncementEntry,
  ClubEvent,
  CollabEntry,
  EventStatus,
  MemoryAlbumEntry,
  MilestoneBadge,
  PartnerEntry,
  ProfileReportEntry,
  RewardEntry,
  RunEntry,
  RunnerComputedStats,
  RunType,
  SiteSettings,
  TeamMember,
  UserProfile,
  VoiceQuoteEntry,
} from '../types';

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Akhil Sharma',
    role: 'Founder',
    instagramUrl: 'https://www.instagram.com/akh1ill/',
  },
  {
    name: 'Aditya',
    role: 'CEO',
    instagramUrl: 'https://www.instagram.com/_dex_aditya/',
  },
];

export const DEFAULT_CONTACT_PHONES: string[] = ['90981 76793', '78287 79901'];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  registrationUrl: '',
  whatsappUrl: 'https://chat.whatsapp.com/JvATq4OmMoD41LqSPfKUwL',
  instagramUrl: 'https://www.instagram.com/rewafrstrunclub/',
  teamMembers: DEFAULT_TEAM_MEMBERS,
  contactPhones: DEFAULT_CONTACT_PHONES,
};

export const DEFAULT_VIJAY_VILAS_COLLAB: CollabEntry = {
  id: 'collab_vijay_vilas',
  partnerName: 'Vijay Villas Sports',
  logoUrl: '',
  title: 'VIJAY VILLAS SPORTS X FRST RUN CLUB',
  dateLabel: 'This Sunday',
  active: true,
  order: 1,
  createdAt: '2026-11-10T00:00:00.000Z',
};

export const DEFAULT_VIJAY_VILLAS_EVENT: ClubEvent = {
  id: 'evt_vijay_vilas_turf',
  title: 'Vijay Villas Sports x FRST Run Club',
  date: '2026-11-15',
  time: '6:00 AM',
  venue: "Vijay Villas Sports (MP's first 360 degree turf)",
  venueName: "Vijay Villas Sports (MP's first 360 degree turf)",
  venueMapUrl: '',
  bannerUrl: '',
  intro:
    'Our next run is on a turf. We will run 3K together, then stay for a morning of games and good energy.',
  mainRunLabel: '3K community run',
  activities: [
    {
      name: 'Cricket',
      detail: 'try a professional bowling machine (up to 160 km/h)',
    },
    {
      name: 'Pickleball and table tennis',
      detail: '',
    },
    {
      name: 'Football',
      detail: 'short turf matches',
    },
    {
      name: 'Badminton',
      detail: '',
    },
    {
      name: 'More arcade and field games',
      detail: '',
    },
  ],
  specialMentionTitle: 'Horse riding zone',
  specialMentionText:
    'A special mention to our premium sponsor. Details coming soon.',
  specialMentionLogoUrl: '',
  safetyNote:
    'Age and safety rules apply to some activities. Please follow the instructions of the venue staff.',
  feeText: '',
  featured: true,
  city: 'Rewa',
  distanceKm: 3,
  fee: { male: 0, female: 0, couple: 0 },
  perks: [],
  registrationUrl: '',
  status: 'upcoming',
  description: '',
};

export function evaluateRunFlags(
  km: number,
  durationSeconds?: number
): { flagged: boolean; flagReason?: string } {
  const reasons: string[] = [];
  if (km > 25) {
    reasons.push('Longer than 25 km');
  }
  if (durationSeconds && durationSeconds > 0 && km > 0) {
    const secPerKm = durationSeconds / km;
    if (secPerKm < 180) {
      reasons.push('Faster than 3:00 min/km');
    }
  }
  return {
    flagged: reasons.length > 0,
    flagReason: reasons.length > 0 ? reasons.join(' · ') : undefined,
  };
}

export function formatAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const codeMatch = raw.match(/\((auth\/[^)]+)\)/);
  const code = codeMatch ? codeMatch[1] : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in the Firebase console yet. Enable Email/Password or Google under Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return raw.replace('Firebase: ', '');
  }
}

/**
 * Returns the Monday 00:00 UTC timestamp (ms) for a YYYY-MM-DD date string.
 */
function getWeekStartMs(dateStr: string): number | null {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Computes consecutive weeks in a row with at least one approved run.
 */
export function computeStreakWeeks(userApprovedRuns: RunEntry[]): number {
  if (userApprovedRuns.length === 0) return 0;

  const weekSet = new Set<number>();
  for (const r of userApprovedRuns) {
    const wk = getWeekStartMs(r.date);
    if (wk !== null) weekSet.add(wk);
  }
  if (weekSet.size === 0) return 0;

  const sortedWeeksDesc = Array.from(weekSet).sort((a, b) => b - a);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  let streak = 1;
  for (let i = 0; i < sortedWeeksDesc.length - 1; i++) {
    const diff = Math.round((sortedWeeksDesc[i] - sortedWeeksDesc[i + 1]) / oneWeekMs);
    if (diff === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

interface ClubContextValue {
  // Status
  loading: boolean;
  error: string | null;
  clearError: () => void;

  // Auth & Current User
  firebaseUser: FirebaseUser | null;
  currentUser: UserProfile | null;
  needsOnboarding: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  completeOnboarding: (data: {
    displayName: string;
    bio: string;
    photoURL: string;
    showPublicly: boolean;
  }) => Promise<boolean>;
  updateMyProfile: (data: {
    displayName: string;
    bio: string;
    photoURL: string;
    bannerURL?: string;
    showPublicly: boolean;
  }) => Promise<void>;
  updateMyProfileMedia: (patch: { photoURL?: string; bannerURL?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  deleteMyAccount: () => Promise<void>;

  // Data Collections
  users: UserProfile[];
  runs: RunEntry[];
  approvedRuns: RunEntry[];
  pendingRuns: RunEntry[];
  events: ClubEvent[];
  collabs: CollabEntry[];
  activeCollabs: CollabEntry[];
  announcements: AnnouncementEntry[];
  voices: VoiceQuoteEntry[];
  memories: MemoryAlbumEntry[];
  partners: PartnerEntry[];
  reports: ProfileReportEntry[];
  rewards: RewardEntry[];
  siteSettings: SiteSettings;

  // Computed Stats & Leaderboards
  currentMonthPrefix: string;
  leaderboardAllTime: RunnerComputedStats[];
  leaderboardThisMonth: RunnerComputedStats[];
  getRunnerStats: (uid: string) => RunnerComputedStats | null;
  getApprovedKmForUser: (uid: string) => number;

  // Runner Run Submission (Pending) & Profile Reporting
  submitPendingRun: (payload: {
    date: string;
    km: number;
    durationSeconds: number;
    type?: RunType;
  }) => Promise<void>;
  submitProfileReport: (payload: {
    targetUid: string;
    targetName: string;
    reason: string;
  }) => Promise<void>;

  // Admin Operations
  addRun: (payload: { uid: string; date: string; km: number; type: RunType }) => Promise<void>;
  updateRun: (
    id: string,
    payload: { uid: string; date: string; km: number; type: RunType }
  ) => Promise<void>;
  approveRun: (id: string) => Promise<void>;
  rejectRun: (id: string) => Promise<void>;
  deleteRun: (id: string) => Promise<void>;
  saveEvent: (event: Omit<ClubEvent, 'id'> & { id?: string }) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  saveCollab: (
    payload: Omit<CollabEntry, 'id' | 'createdAt'> & { id?: string }
  ) => Promise<void>;
  toggleCollabActive: (id: string, active: boolean) => Promise<void>;
  reorderCollab: (id: string, direction: 'up' | 'down') => Promise<void>;
  deleteCollab: (id: string) => Promise<void>;
  saveAnnouncement: (payload: { id?: string; text: string; pinned: boolean }) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  saveVoiceQuote: (payload: {
    id?: string;
    quote: string;
    runnerName: string;
    tag?: string;
  }) => Promise<void>;
  deleteVoiceQuote: (id: string) => Promise<void>;
  saveMemoryAlbum: (payload: {
    id?: string;
    title: string;
    date: string;
    coverPhoto: string;
    link: string;
  }) => Promise<void>;
  deleteMemoryAlbum: (id: string) => Promise<void>;
  savePartnerEntry: (payload: {
    id?: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
  }) => Promise<void>;
  deletePartnerEntry: (id: string) => Promise<void>;
  moderateUserProfile: (
    uid: string,
    patch: {
      showPublicly?: boolean;
      bio?: string;
      photoURL?: string;
      bannerURL?: string;
    }
  ) => Promise<void>;
  resolveProfileReport: (id: string) => Promise<void>;
  deleteProfileReport: (id: string) => Promise<void>;
  saveReward: (payload: {
    id?: string;
    month: string;
    rank: 1 | 2 | 3;
    rewardName: string;
    claimed: boolean;
  }) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  updateSiteSettings: (payload: SiteSettings) => Promise<void>;
}

const ClubContext = createContext<ClubContextValue | undefined>(undefined);

const LEGACY_DEMO_KEYS = [
  'rewa_frst_users_v1',
  'rewa_frst_runs_v1',
  'rewa_frst_events_v1',
  'rewa_frst_rewards_v1',
  'rewa_frst_milestones_v1',
  'rewa_frst_settings_v1',
  'rewa_frst_demo_uid_v1',
];

export function computeBadges(totalKm: number): {
  badges: MilestoneBadge[];
  nextBadge: { targetKm: number; remainingKm: number; progressPct: number } | null;
} {
  const tiers: Array<{ km: 10 | 25 | 50 | 100; label: string; hindiSub: string }> = [
    { km: 10, label: '10 km', hindiSub: 'Starter' },
    { km: 25, label: '25 km', hindiSub: 'Regular' },
    { km: 50, label: '50 km', hindiSub: 'Half-Century' },
    { km: 100, label: '100 km', hindiSub: 'Centurion' },
  ];

  const badges: MilestoneBadge[] = tiers.map((t) => ({
    ...t,
    unlocked: totalKm >= t.km,
  }));

  const nextTier = tiers.find((t) => totalKm < t.km);
  if (!nextTier) {
    return { badges, nextBadge: null };
  }

  const prevTierKm =
    nextTier.km === 10 ? 0 : nextTier.km === 25 ? 10 : nextTier.km === 50 ? 25 : 50;
  const span = nextTier.km - prevTierKm;
  const coveredInSpan = Math.max(0, totalKm - prevTierKm);
  const progressPct = Math.min(100, Math.round((coveredInSpan / span) * 100));
  const remainingKm = Number(Math.max(0, nextTier.km - totalKm).toFixed(1));

  return {
    badges,
    nextBadge: {
      targetKm: nextTier.km,
      remainingKm,
      progressPct,
    },
  };
}

export const ClubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fsPublicUsers, setFsPublicUsers] = useState<UserProfile[]>([]);
  const [fsAdminAllUsers, setFsAdminAllUsers] = useState<UserProfile[]>([]);
  const [fsRuns, setFsRuns] = useState<RunEntry[]>([]);
  const [fsEvents, setFsEvents] = useState<ClubEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [fsCollabs, setFsCollabs] = useState<CollabEntry[]>([]);
  const [collabsLoaded, setCollabsLoaded] = useState(false);
  const [fsAnnouncements, setFsAnnouncements] = useState<AnnouncementEntry[]>([]);
  const [fsVoices, setFsVoices] = useState<VoiceQuoteEntry[]>([]);
  const [fsMemories, setFsMemories] = useState<MemoryAlbumEntry[]>([]);
  const [fsPartners, setFsPartners] = useState<PartnerEntry[]>([]);
  const [fsReports, setFsReports] = useState<ProfileReportEntry[]>([]);
  const [fsRewards, setFsRewards] = useState<RewardEntry[]>([]);
  const [fsSettings, setFsSettings] = useState<SiteSettings | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [myFsProfile, setMyFsProfile] = useState<UserProfile | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collabSeededRef = useRef(false);
  const eventSeededRef = useRef(false);

  // Purge any leftover demo data from localStorage on boot
  useEffect(() => {
    try {
      LEGACY_DEMO_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setMyFsProfile(null);
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as Omit<UserProfile, 'uid'>;
          setMyFsProfile({
            uid: fbUser.uid,
            city: data.city || 'Rewa',
            ...data,
          });
          setNeedsOnboarding(false);
        } else {
          setMyFsProfile(null);
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.warn('Could not fetch user profile from Firestore:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const currentUser: UserProfile | null = myFsProfile;
  const isAdmin = Boolean(currentUser?.role === 'admin');

  // Attach Firestore listeners when authenticated with Firebase
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser) {
      setFsPublicUsers([]);
      setFsAdminAllUsers([]);
      setFsRuns([]);
      setFsEvents([]);
      setEventsLoaded(false);
      setFsCollabs([]);
      setCollabsLoaded(false);
      setFsAnnouncements([]);
      setFsVoices([]);
      setFsMemories([]);
      setFsPartners([]);
      setFsReports([]);
      setFsRewards([]);
      setFsSettings(null);
      return;
    }

    // 1. Public users query (enforced by firestore.rules: showPublicly == true)
    const usersQ = query(collection(db, 'users'), where('showPublicly', '==', true));
    const unsubUsers = onSnapshot(
      usersQ,
      (snap) => {
        const list: UserProfile[] = snap.docs
          .map((d) => {
            const raw = d.data() as Omit<UserProfile, 'uid'>;
            return {
              uid: d.id,
              city: raw.city || 'Rewa',
              ...raw,
            };
          })
          .filter((u) => !u.uid.startsWith('demo_'));
        setFsPublicUsers(list);
      },
      (err) => {
        console.warn('Firestore users listener notice:', err.message);
      }
    );

    // 2. Own profile listener
    const myDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubMe = onSnapshot(
      myDocRef,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as Omit<UserProfile, 'uid'>;
          setMyFsProfile({
            uid: snap.id,
            city: raw.city || 'Rewa',
            ...raw,
          });
          setNeedsOnboarding(false);
        } else {
          setMyFsProfile(null);
          setNeedsOnboarding(true);
        }
      },
      (err) => {
        console.warn('Firestore my profile listener notice:', err.message);
      }
    );

    // 3. Runs query (km > 0 as required by security rules)
    const runsQ = query(collection(db, 'runs'), where('km', '>', 0));
    const unsubRuns = onSnapshot(
      runsQ,
      (snap) => {
        const list: RunEntry[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<RunEntry, 'id'>),
          }))
          .filter((r) => !r.id.startsWith('demo_') && !r.uid.startsWith('demo_'));
        setFsRuns(list);
      },
      (err) => {
        console.warn('Firestore runs listener notice:', err.message);
      }
    );

    // 4. Events query (distanceKm > 0 as required by security rules)
    const eventsQ = query(collection(db, 'events'), where('distanceKm', '>', 0));
    const unsubEvents = onSnapshot(
      eventsQ,
      (snap) => {
        const list: ClubEvent[] = snap.docs
          .map((d) => {
            const raw = d.data() as Omit<ClubEvent, 'id'>;
            return {
              id: d.id,
              city: raw.city || 'Rewa',
              ...raw,
              venue: raw.venueName || raw.venue || '',
              venueName: raw.venueName || raw.venue || '',
            };
          })
          .filter((e) => !e.id.startsWith('demo_'));
        setFsEvents(list);
        setEventsLoaded(true);
      },
      (err) => {
        console.warn('Firestore events listener notice:', err.message);
        setEventsLoaded(true);
      }
    );

    // 4b. Collaborations query (order >= 0 as required by security rules)
    const collabsQ = query(collection(db, 'collabs'), where('order', '>=', 0));
    const unsubCollabs = onSnapshot(
      collabsQ,
      (snap) => {
        const list: CollabEntry[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const rawTitle = typeof raw.title === 'string' ? raw.title : '';
          const upperTitle = rawTitle.trim().toUpperCase();
          const normalizedTitle =
            upperTitle === 'FRST RUN CLUB X VIJAY VILAS SPORTS' ||
            upperTitle === 'VIJAY VILAS SPORTS X FRST RUN CLUB'
              ? 'VIJAY VILLAS SPORTS X FRST RUN CLUB'
              : rawTitle;
          const rawPartner =
            typeof raw.partnerName === 'string' ? raw.partnerName : '';
          const normalizedPartner =
            rawPartner.trim().toLowerCase() === 'vijay vilas sports'
              ? 'Vijay Villas Sports'
              : rawPartner;
          return {
            id: d.id,
            partnerName: normalizedPartner,
            logoUrl: typeof raw.logoUrl === 'string' ? raw.logoUrl : '',
            title: normalizedTitle,
            dateLabel: typeof raw.dateLabel === 'string' ? raw.dateLabel : '',
            active: Boolean(raw.active),
            order: typeof raw.order === 'number' ? raw.order : 1,
            createdAt:
              typeof raw.createdAt === 'string'
                ? raw.createdAt
                : '2026-11-10T00:00:00.000Z',
          };
        });
        setFsCollabs(list);
        setCollabsLoaded(true);
      },
      (err) => {
        console.warn('Firestore collabs listener notice:', err.message);
        setCollabsLoaded(true);
      }
    );

    // 5. Announcements query (createdAt >= '' as required by security rules)
    const announcementsQ = query(collection(db, 'announcements'), where('createdAt', '>=', ''));
    const unsubAnnouncements = onSnapshot(
      announcementsQ,
      (snap) => {
        const list: AnnouncementEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AnnouncementEntry, 'id'>),
        }));
        setFsAnnouncements(list);
      },
      (err) => {
        console.warn('Firestore announcements listener notice:', err.message);
      }
    );

    // 5b. Voices query
    const voicesQ = query(collection(db, 'voices'), where('createdAt', '>=', ''));
    const unsubVoices = onSnapshot(
      voicesQ,
      (snap) => {
        const list: VoiceQuoteEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<VoiceQuoteEntry, 'id'>),
        }));
        setFsVoices(list);
      },
      (err) => {
        console.warn('Firestore voices listener notice:', err.message);
      }
    );

    // 5c. Memories query
    const memoriesQ = query(collection(db, 'memories'), where('createdAt', '>=', ''));
    const unsubMemories = onSnapshot(
      memoriesQ,
      (snap) => {
        const list: MemoryAlbumEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MemoryAlbumEntry, 'id'>),
        }));
        setFsMemories(list);
      },
      (err) => {
        console.warn('Firestore memories listener notice:', err.message);
      }
    );

    // 5d. Partners query
    const partnersQ = query(collection(db, 'partners'), where('createdAt', '>=', ''));
    const unsubPartners = onSnapshot(
      partnersQ,
      (snap) => {
        const list: PartnerEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PartnerEntry, 'id'>),
        }));
        setFsPartners(list);
      },
      (err) => {
        console.warn('Firestore partners listener notice:', err.message);
      }
    );

    // 6. Rewards query (rank >= 1 as required by security rules)
    const rewardsQ = query(collection(db, 'rewards'), where('rank', '>=', 1));
    const unsubRewards = onSnapshot(
      rewardsQ,
      (snap) => {
        const list: RewardEntry[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<RewardEntry, 'id'>),
          }))
          .filter((rw) => !rw.id.startsWith('demo_'));
        setFsRewards(list);
      },
      (err) => {
        console.warn('Firestore rewards listener notice:', err.message);
      }
    );

    // 7. Site settings document
    const settingsRef = doc(db, 'settings', 'site');
    const unsubSettings = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setFsSettings(snap.data() as SiteSettings);
        } else {
          setFsSettings(null);
        }
      },
      () => {
        // Ignore if settings/site not created yet
      }
    );

    return () => {
      unsubUsers();
      unsubMe();
      unsubRuns();
      unsubEvents();
      unsubCollabs();
      unsubAnnouncements();
      unsubVoices();
      unsubMemories();
      unsubPartners();
      unsubRewards();
      unsubSettings();
    };
  }, [firebaseUser]);

  // Seed the first collaboration (Vijay Villas Sports) in Firestore once if empty
  useEffect(() => {
    if (
      !isFirebaseConfigured ||
      !firebaseUser ||
      !collabsLoaded ||
      fsCollabs.length > 0 ||
      collabSeededRef.current
    ) {
      return;
    }

    const seedKey = 'frst_vijay_vilas_collab_seeded_v1';
    try {
      if (localStorage.getItem(seedKey) === 'deleted') {
        return;
      }
    } catch {
      // Ignore storage error
    }

    collabSeededRef.current = true;
    const { id, ...seedData } = DEFAULT_VIJAY_VILAS_COLLAB;
    setDoc(doc(db, 'collabs', id), seedData).catch(() => {
      // If user is not admin and doc hasn't been seeded yet, fallback in memory handles display
    });
  }, [firebaseUser, collabsLoaded, fsCollabs.length]);

  // Seed the first event (Vijay Villas Sports x FRST Run Club) in Firestore once if empty
  useEffect(() => {
    if (
      !isFirebaseConfigured ||
      !firebaseUser ||
      !eventsLoaded ||
      fsEvents.length > 0 ||
      eventSeededRef.current
    ) {
      return;
    }

    const seedKey = 'frst_vijay_vilas_event_seeded_v1';
    try {
      if (localStorage.getItem(seedKey) === 'deleted') {
        return;
      }
    } catch {
      // Ignore storage error
    }

    eventSeededRef.current = true;
    const { id, ...seedData } = DEFAULT_VIJAY_VILLAS_EVENT;
    setDoc(doc(db, 'events', id), seedData).catch(() => {
      // Fallback in memory handles display if not yet created in Firestore
    });
  }, [firebaseUser, eventsLoaded, fsEvents.length]);

  // Admin-only listeners for ALL users (including hidden profiles) and profile reports
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser || !isAdmin) {
      setFsAdminAllUsers([]);
      setFsReports([]);
      return;
    }

    const unsubAllUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = snap.docs
          .map((d) => {
            const raw = d.data() as Omit<UserProfile, 'uid'>;
            return {
              uid: d.id,
              city: raw.city || 'Rewa',
              ...raw,
            };
          })
          .filter((u) => !u.uid.startsWith('demo_'));
        setFsAdminAllUsers(list);
      },
      (err) => {
        console.warn('Firestore admin users listener notice:', err.message);
      }
    );

    const reportsQ = query(collection(db, 'reports'), where('createdAt', '>=', ''));
    const unsubReports = onSnapshot(
      reportsQ,
      (snap) => {
        const list: ProfileReportEntry[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ProfileReportEntry, 'id'>),
        }));
        setFsReports(list);
      },
      (err) => {
        console.warn('Firestore reports listener notice:', err.message);
      }
    );

    return () => {
      unsubAllUsers();
      unsubReports();
    };
  }, [firebaseUser, isAdmin]);

  const users = useMemo(() => {
    const map = new Map<string, UserProfile>();
    fsPublicUsers.forEach((u) => map.set(u.uid, u));
    fsAdminAllUsers.forEach((u) => map.set(u.uid, u));
    if (myFsProfile) {
      map.set(myFsProfile.uid, myFsProfile);
    }
    return Array.from(map.values());
  }, [fsPublicUsers, fsAdminAllUsers, myFsProfile]);

  const runs = useMemo(() => {
    return [...fsRuns].sort((a, b) => b.date.localeCompare(a.date));
  }, [fsRuns]);

  const approvedRuns = useMemo(
    () => runs.filter((r) => !r.status || r.status === 'approved'),
    [runs]
  );

  const pendingRuns = useMemo(
    () => runs.filter((r) => r.status === 'pending'),
    [runs]
  );

  const events = useMemo(() => {
    if (fsEvents.length === 0) {
      try {
        if (localStorage.getItem('frst_vijay_vilas_event_seeded_v1') === 'deleted') {
          return [];
        }
      } catch {
        // Ignore
      }
      return [DEFAULT_VIJAY_VILLAS_EVENT];
    }
    return [...fsEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [fsEvents]);

  const collabs = useMemo(() => {
    if (fsCollabs.length === 0) {
      try {
        if (localStorage.getItem('frst_vijay_vilas_collab_seeded_v1') === 'deleted') {
          return [];
        }
      } catch {
        // Ignore
      }
      return [DEFAULT_VIJAY_VILAS_COLLAB];
    }
    return [...fsCollabs].sort(
      (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)
    );
  }, [fsCollabs]);

  const activeCollabs = useMemo(() => {
    return collabs.filter((c) => c.active);
  }, [collabs]);

  const announcements = useMemo(() => {
    return [...fsAnnouncements].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [fsAnnouncements]);

  const voices = useMemo(() => {
    return [...fsVoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [fsVoices]);

  const memories = useMemo(() => {
    return [...fsMemories].sort((a, b) => b.date.localeCompare(a.date));
  }, [fsMemories]);

  const partners = useMemo(() => {
    return [...fsPartners].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [fsPartners]);

  const reports = useMemo(() => {
    return [...fsReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [fsReports]);

  const rewards = useMemo(() => {
    return [...fsRewards].sort((a, b) => a.rank - b.rank);
  }, [fsRewards]);

  const siteSettings: SiteSettings = useMemo(() => {
    if (!fsSettings) return DEFAULT_SITE_SETTINGS;
    return {
      registrationUrl: fsSettings.registrationUrl || '',
      whatsappUrl: fsSettings.whatsappUrl || DEFAULT_SITE_SETTINGS.whatsappUrl,
      instagramUrl: fsSettings.instagramUrl || DEFAULT_SITE_SETTINGS.instagramUrl,
      teamMembers:
        fsSettings.teamMembers && fsSettings.teamMembers.length > 0
          ? fsSettings.teamMembers
          : DEFAULT_TEAM_MEMBERS,
      contactPhones:
        fsSettings.contactPhones && fsSettings.contactPhones.length > 0
          ? fsSettings.contactPhones
          : DEFAULT_CONTACT_PHONES,
    };
  }, [fsSettings]);

  const currentMonthPrefix = useMemo(() => {
    if (approvedRuns.length === 0) {
      return new Date().toISOString().slice(0, 7);
    }
    return approvedRuns[0].date.slice(0, 7);
  }, [approvedRuns]);

  const getApprovedKmForUser = (uid: string): number => {
    const userRuns = approvedRuns.filter((r) => r.uid === uid);
    return Number(userRuns.reduce((acc, r) => acc + Number(r.km), 0).toFixed(1));
  };

  // Compute runner stats & rankings from real approved runs only
  const allRunnerStatsMap = useMemo(() => {
    const publicUsers = users.filter((u) => u.showPublicly);

    const rawStats = publicUsers.map((user) => {
      const userRuns = approvedRuns.filter((r) => r.uid === user.uid);
      const monthlyRuns = userRuns.filter((r) => r.date.startsWith(currentMonthPrefix));
      const totalKm = Number(userRuns.reduce((acc, r) => acc + Number(r.km), 0).toFixed(1));
      const monthlyKm = Number(monthlyRuns.reduce((acc, r) => acc + Number(r.km), 0).toFixed(1));
      const { badges, nextBadge } = computeBadges(totalKm);
      const streakWeeks = computeStreakWeeks(userRuns);

      return {
        user,
        totalKm,
        monthlyKm,
        runsCount: userRuns.length,
        monthlyRunsCount: monthlyRuns.length,
        allTimeRank: 0,
        monthlyRank: 0,
        streakWeeks,
        badges,
        nextBadge,
        recentRuns: userRuns.slice(0, 8),
      } satisfies RunnerComputedStats;
    });

    const byAllTime = [...rawStats].sort(
      (a, b) => b.totalKm - a.totalKm || b.runsCount - a.runsCount
    );
    let currentAllTimeRank = 0;
    byAllTime.forEach((item) => {
      if (item.totalKm > 0) {
        currentAllTimeRank += 1;
        item.allTimeRank = currentAllTimeRank;
      } else {
        item.allTimeRank = 0;
      }
    });

    const byMonth = [...rawStats].sort(
      (a, b) => b.monthlyKm - a.monthlyKm || b.totalKm - a.totalKm
    );
    let currentMonthlyRank = 0;
    byMonth.forEach((item) => {
      if (item.monthlyKm > 0) {
        currentMonthlyRank += 1;
        item.monthlyRank = currentMonthlyRank;
      } else {
        item.monthlyRank = 0;
      }
    });

    const statsByUid = new Map<string, RunnerComputedStats>();
    rawStats.forEach((s) => statsByUid.set(s.user.uid, s));

    if (currentUser && !currentUser.showPublicly) {
      const userRuns = approvedRuns.filter((r) => r.uid === currentUser.uid);
      const monthlyRuns = userRuns.filter((r) => r.date.startsWith(currentMonthPrefix));
      const totalKm = Number(userRuns.reduce((acc, r) => acc + Number(r.km), 0).toFixed(1));
      const monthlyKm = Number(monthlyRuns.reduce((acc, r) => acc + Number(r.km), 0).toFixed(1));
      const { badges, nextBadge } = computeBadges(totalKm);
      const streakWeeks = computeStreakWeeks(userRuns);
      statsByUid.set(currentUser.uid, {
        user: currentUser,
        totalKm,
        monthlyKm,
        runsCount: userRuns.length,
        monthlyRunsCount: monthlyRuns.length,
        allTimeRank: 0,
        monthlyRank: 0,
        streakWeeks,
        badges,
        nextBadge,
        recentRuns: userRuns.slice(0, 8),
      });
    }

    return {
      statsByUid,
      leaderboardAllTime: byAllTime,
      leaderboardThisMonth: byMonth,
    };
  }, [users, approvedRuns, currentMonthPrefix, currentUser]);

  const getRunnerStats = (uid: string): RunnerComputedStats | null => {
    return allRunnerStatsMap.statsByUid.get(uid) || null;
  };

  // Auth Actions
  const signInWithGoogle = async (): Promise<boolean> => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const signUpWithEmail = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address first, then tap Forgot password.');
      return false;
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      return true;
    } catch (err) {
      setError(formatAuthError(err));
      return false;
    }
  };

  const completeOnboarding = async (data: {
    displayName: string;
    bio: string;
    photoURL: string;
    showPublicly: boolean;
  }): Promise<boolean> => {
    setError(null);
    if (!firebaseUser) {
      setError('Please sign in first.');
      return false;
    }

    const cleanName = data.displayName.trim().slice(0, 80);
    const cleanBio = data.bio.trim().slice(0, 120);
    const cleanPhoto = data.photoURL.trim().slice(0, 1000);

    if (!cleanName) {
      setError('Display name is required.');
      return false;
    }

    const newProfile: Omit<UserProfile, 'uid'> = {
      displayName: cleanName,
      bio: cleanBio,
      photoURL: cleanPhoto,
      city: 'Rewa',
      role: 'runner',
      createdAt: new Date().toISOString(),
      showPublicly: data.showPublicly,
    };

    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      setMyFsProfile({ uid: firebaseUser.uid, ...newProfile });
      setNeedsOnboarding(false);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
    }
  };

  const updateMyProfile = async (data: {
    displayName: string;
    bio: string;
    photoURL: string;
    bannerURL?: string;
    showPublicly: boolean;
  }) => {
    if (!currentUser || !firebaseUser) return;
    setError(null);

    const cleanName = data.displayName.trim().slice(0, 80);
    const cleanBio = data.bio.trim().slice(0, 120);
    const cleanPhoto = data.photoURL.trim().slice(0, 1000);

    if (!cleanName) {
      setError('Display name cannot be empty.');
      return;
    }

    const updatePayload: Record<string, unknown> = {
      displayName: cleanName,
      bio: cleanBio,
      photoURL: cleanPhoto,
      showPublicly: data.showPublicly,
      city: currentUser.city || 'Rewa',
    };
    if (data.bannerURL !== undefined) {
      updatePayload.bannerURL = data.bannerURL.trim().slice(0, 1000);
    }

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const updateMyProfileMedia = async (patch: { photoURL?: string; bannerURL?: string }) => {
    if (!currentUser || !firebaseUser) return;
    setError(null);

    const updatePayload: Record<string, unknown> = {};
    if (patch.photoURL !== undefined) {
      updatePayload.photoURL = patch.photoURL.trim().slice(0, 1000);
    }
    if (patch.bannerURL !== undefined) {
      updatePayload.bannerURL = patch.bannerURL.trim().slice(0, 1000);
    }
    if (Object.keys(updatePayload).length === 0) return;

    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const signOut = async () => {
    setError(null);
    if (firebaseUser && isFirebaseConfigured) {
      await fbSignOut(auth);
    }
  };

  const deleteMyAccount = async () => {
    if (!currentUser || !firebaseUser) return;
    setError(null);
    const targetUid = currentUser.uid;

    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
    try {
      await deleteUser(firebaseUser);
    } catch {
      await fbSignOut(auth);
    }
  };

  // Runner Pending Run Submission (GPS or Manual)
  const submitPendingRun = async (payload: {
    date: string;
    km: number;
    durationSeconds: number;
    type?: RunType;
  }) => {
    if (!currentUser || !firebaseUser) {
      setError('Please sign in to save a run.');
      return;
    }
    setError(null);

    const cleanKm = Number(Number(payload.km).toFixed(2));
    if (isNaN(cleanKm) || cleanKm <= 0) {
      setError('Run distance must be greater than 0 km.');
      return;
    }

    const cleanDuration = Math.max(0, Math.round(payload.durationSeconds || 0));
    const { flagged, flagReason } = evaluateRunFlags(cleanKm, cleanDuration);
    const runId = `run_${Date.now()}`;

    const newRunData: Omit<RunEntry, 'id'> = {
      uid: currentUser.uid,
      date: payload.date,
      km: cleanKm,
      type: payload.type || 'Personal',
      addedBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      status: 'pending',
      durationSeconds: cleanDuration,
      flagged,
      ...(flagReason ? { flagReason } : {}),
    };

    try {
      await setDoc(doc(db, 'runs', runId), newRunData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `runs/${runId}`);
    }
  };

  const submitProfileReport = async (payload: {
    targetUid: string;
    targetName: string;
    reason: string;
  }) => {
    if (!currentUser || !firebaseUser) {
      setError('Please sign in to submit a report.');
      return;
    }
    setError(null);
    const cleanReason = payload.reason.trim().slice(0, 200);
    if (!cleanReason) return;

    const reportId = `rep_${Date.now()}`;
    const docData: Omit<ProfileReportEntry, 'id'> = {
      targetUid: payload.targetUid,
      targetName: payload.targetName.trim().slice(0, 80),
      reason: cleanReason,
      reportedBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    try {
      await setDoc(doc(db, 'reports', reportId), docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
    }
  };

  // Admin CRUD Operations
  const addRun = async (payload: { uid: string; date: string; km: number; type: RunType }) => {
    if (!isAdmin || !currentUser || !firebaseUser) {
      setError('Admins only.');
      return;
    }
    setError(null);
    const runId = `run_${Date.now()}`;
    const newRun: Omit<RunEntry, 'id'> = {
      uid: payload.uid,
      date: payload.date,
      km: Number(payload.km),
      type: payload.type,
      addedBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      status: 'approved',
    };

    try {
      await setDoc(doc(db, 'runs', runId), newRun);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `runs/${runId}`);
    }
  };

  const updateRun = async (
    id: string,
    payload: { uid: string; date: string; km: number; type: RunType }
  ) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await updateDoc(doc(db, 'runs', id), {
        uid: payload.uid,
        date: payload.date,
        km: Number(payload.km),
        type: payload.type,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `runs/${id}`);
    }
  };

  const approveRun = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await updateDoc(doc(db, 'runs', id), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `runs/${id}`);
    }
  };

  const rejectRun = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await updateDoc(doc(db, 'runs', id), { status: 'rejected' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `runs/${id}`);
    }
  };

  const deleteRun = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await deleteDoc(doc(db, 'runs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `runs/${id}`);
    }
  };

  const saveEvent = async (eventData: Omit<ClubEvent, 'id'> & { id?: string }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const eventId = eventData.id || `evt_${Date.now()}`;
    const validStatus: EventStatus =
      eventData.status === 'past' || eventData.status === 'cancelled'
        ? eventData.status
        : 'upcoming';

    const cleanVenue = (eventData.venueName || eventData.venue || '').trim().slice(0, 160);
    const cleanActivities = (eventData.activities || [])
      .map((a) => ({
        name: (a.name || '').trim().slice(0, 100),
        detail: (a.detail || '').trim().slice(0, 160),
      }))
      .filter((a) => a.name.length > 0)
      .slice(0, 20);

    const cleanPayload: Omit<ClubEvent, 'id'> = {
      title: eventData.title.trim().slice(0, 120),
      date: eventData.date,
      time: eventData.time.trim().slice(0, 30),
      venue: cleanVenue,
      venueName: cleanVenue,
      venueMapUrl: (eventData.venueMapUrl || '').trim().slice(0, 500),
      bannerUrl: (eventData.bannerUrl || '').trim().slice(0, 1000),
      intro: (eventData.intro || '').trim().slice(0, 240),
      mainRunLabel: (eventData.mainRunLabel || '').trim().slice(0, 100),
      activities: cleanActivities,
      specialMentionTitle: (eventData.specialMentionTitle || '').trim().slice(0, 100),
      specialMentionText: (eventData.specialMentionText || '').trim().slice(0, 300),
      specialMentionLogoUrl: (eventData.specialMentionLogoUrl || '').trim().slice(0, 1000),
      safetyNote: (eventData.safetyNote || '').trim().slice(0, 300),
      feeText: (eventData.feeText || '').trim().slice(0, 100),
      featured: Boolean(eventData.featured),
      city: (eventData.city || 'Rewa').trim().slice(0, 60) || 'Rewa',
      distanceKm: Math.max(0.5, Number(eventData.distanceKm) || 3),
      fee: {
        male: Math.max(0, Number(eventData.fee?.male) || 0),
        female: Math.max(0, Number(eventData.fee?.female) || 0),
        couple: Math.max(0, Number(eventData.fee?.couple) || 0),
      },
      perks: (eventData.perks || [])
        .map((p) => p.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 25),
      registrationUrl: (eventData.registrationUrl || '').trim().slice(0, 500),
      status: validStatus,
      description: (eventData.description || '').trim().slice(0, 500),
    };

    const isExistingFs = fsEvents.some((e) => e.id === eventId);
    try {
      await setDoc(doc(db, 'events', eventId), cleanPayload);
    } catch (err) {
      handleFirestoreError(
        err,
        isExistingFs ? OperationType.UPDATE : OperationType.CREATE,
        `events/${eventId}`
      );
    }
  };

  const deleteEvent = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    if (id === DEFAULT_VIJAY_VILLAS_EVENT.id) {
      try {
        localStorage.setItem('frst_vijay_vilas_event_seeded_v1', 'deleted');
      } catch {
        // Ignore
      }
    }

    const existsInFs = fsEvents.some((e) => e.id === id);
    if (!existsInFs) {
      setFsEvents((prev) => [...prev]);
      return;
    }

    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  // Collaborations CRUD
  const saveCollab = async (
    payload: Omit<CollabEntry, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const collabId = payload.id || `col_${Date.now()}`;
    const existingDoc = fsCollabs.find((c) => c.id === collabId);
    const cleanData = {
      partnerName: payload.partnerName.trim().slice(0, 80),
      logoUrl: (payload.logoUrl || '').trim().slice(0, 1000),
      title: payload.title.trim().slice(0, 120),
      dateLabel: (payload.dateLabel || '').trim().slice(0, 60),
      active: Boolean(payload.active),
      order: Math.max(0, Math.round(Number(payload.order) || 0)),
      createdAt: existingDoc?.createdAt || new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'collabs', collabId), cleanData);
    } catch (err) {
      handleFirestoreError(
        err,
        existingDoc ? OperationType.UPDATE : OperationType.CREATE,
        `collabs/${collabId}`
      );
    }
  };

  const toggleCollabActive = async (id: string, active: boolean) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const existingDoc = collabs.find((c) => c.id === id);
    if (!existingDoc) return;

    const { id: _id, ...rest } = existingDoc;
    try {
      await setDoc(doc(db, 'collabs', id), {
        partnerName: rest.partnerName,
        logoUrl: rest.logoUrl || '',
        title: rest.title,
        dateLabel: rest.dateLabel || '',
        active,
        order: rest.order,
        createdAt: rest.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `collabs/${id}`);
    }
  };

  const reorderCollab = async (id: string, direction: 'up' | 'down') => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const sorted = [...collabs];
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const itemA = sorted[idx];
    const itemB = sorted[swapIdx];

    const newOrderA = swapIdx + 1;
    const newOrderB = idx + 1;

    try {
      await setDoc(doc(db, 'collabs', itemA.id), {
        partnerName: itemA.partnerName,
        logoUrl: itemA.logoUrl || '',
        title: itemA.title,
        dateLabel: itemA.dateLabel || '',
        active: itemA.active,
        order: newOrderA,
        createdAt: itemA.createdAt || new Date().toISOString(),
      });
      await setDoc(doc(db, 'collabs', itemB.id), {
        partnerName: itemB.partnerName,
        logoUrl: itemB.logoUrl || '',
        title: itemB.title,
        dateLabel: itemB.dateLabel || '',
        active: itemB.active,
        order: newOrderB,
        createdAt: itemB.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `collabs/${id}`);
    }
  };

  const deleteCollab = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    if (id === DEFAULT_VIJAY_VILAS_COLLAB.id) {
      try {
        localStorage.setItem('frst_vijay_vilas_collab_seeded_v1', 'deleted');
      } catch {
        // Ignore
      }
    }

    const existsInFs = fsCollabs.some((c) => c.id === id);
    if (!existsInFs) {
      setFsCollabs((prev) => [...prev]);
      return;
    }

    try {
      await deleteDoc(doc(db, 'collabs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `collabs/${id}`);
    }
  };

  const saveAnnouncement = async (payload: {
    id?: string;
    text: string;
    pinned: boolean;
  }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const cleanText = payload.text.trim().slice(0, 200);
    if (!cleanText) return;

    const annId = payload.id || `ann_${Date.now()}`;
    const isExisting = fsAnnouncements.some((a) => a.id === annId);

    try {
      if (isExisting) {
        await updateDoc(doc(db, 'announcements', annId), {
          text: cleanText,
          pinned: payload.pinned,
        });
      } else {
        const newDoc: Omit<AnnouncementEntry, 'id'> = {
          text: cleanText,
          pinned: payload.pinned,
          createdAt: new Date().toISOString(),
          createdBy: firebaseUser.uid,
        };
        await setDoc(doc(db, 'announcements', annId), newDoc);
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isExisting ? OperationType.UPDATE : OperationType.CREATE,
        `announcements/${annId}`
      );
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const saveVoiceQuote = async (payload: {
    id?: string;
    quote: string;
    runnerName: string;
    tag?: string;
  }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    const cleanQuote = payload.quote.trim().slice(0, 240);
    const cleanName = payload.runnerName.trim().slice(0, 80);
    const cleanTag = (payload.tag || '').trim().slice(0, 60);
    if (!cleanQuote || !cleanName) return;

    const voiceId = payload.id || `vc_${Date.now()}`;
    const isExisting = fsVoices.some((v) => v.id === voiceId);
    try {
      if (isExisting) {
        await updateDoc(doc(db, 'voices', voiceId), {
          quote: cleanQuote,
          runnerName: cleanName,
          ...(cleanTag ? { tag: cleanTag } : {}),
        });
      } else {
        await setDoc(doc(db, 'voices', voiceId), {
          quote: cleanQuote,
          runnerName: cleanName,
          ...(cleanTag ? { tag: cleanTag } : {}),
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isExisting ? OperationType.UPDATE : OperationType.CREATE,
        `voices/${voiceId}`
      );
    }
  };

  const deleteVoiceQuote = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'voices', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `voices/${id}`);
    }
  };

  const saveMemoryAlbum = async (payload: {
    id?: string;
    title: string;
    date: string;
    coverPhoto: string;
    link: string;
  }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    const cleanTitle = payload.title.trim().slice(0, 120);
    const cleanDate = payload.date.trim().slice(0, 10);
    const cleanPhoto = payload.coverPhoto.trim().slice(0, 500);
    const cleanLink = payload.link.trim().slice(0, 500);
    if (!cleanTitle || !cleanDate || !cleanPhoto || !cleanLink) return;

    const memId = payload.id || `mem_${Date.now()}`;
    const isExisting = fsMemories.some((m) => m.id === memId);
    try {
      if (isExisting) {
        await updateDoc(doc(db, 'memories', memId), {
          title: cleanTitle,
          date: cleanDate,
          coverPhoto: cleanPhoto,
          link: cleanLink,
        });
      } else {
        await setDoc(doc(db, 'memories', memId), {
          title: cleanTitle,
          date: cleanDate,
          coverPhoto: cleanPhoto,
          link: cleanLink,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isExisting ? OperationType.UPDATE : OperationType.CREATE,
        `memories/${memId}`
      );
    }
  };

  const deleteMemoryAlbum = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'memories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `memories/${id}`);
    }
  };

  const savePartnerEntry = async (payload: {
    id?: string;
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
  }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    const cleanName = payload.name.trim().slice(0, 80);
    const cleanLogo = (payload.logoUrl || '').trim().slice(0, 500);
    const cleanWeb = (payload.websiteUrl || '').trim().slice(0, 500);
    if (!cleanName) return;

    const partId = payload.id || `prt_${Date.now()}`;
    const isExisting = fsPartners.some((p) => p.id === partId);
    try {
      if (isExisting) {
        await updateDoc(doc(db, 'partners', partId), {
          name: cleanName,
          ...(cleanLogo ? { logoUrl: cleanLogo } : {}),
          ...(cleanWeb ? { websiteUrl: cleanWeb } : {}),
        });
      } else {
        await setDoc(doc(db, 'partners', partId), {
          name: cleanName,
          ...(cleanLogo ? { logoUrl: cleanLogo } : {}),
          ...(cleanWeb ? { websiteUrl: cleanWeb } : {}),
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isExisting ? OperationType.UPDATE : OperationType.CREATE,
        `partners/${partId}`
      );
    }
  };

  const deletePartnerEntry = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);
    try {
      await deleteDoc(doc(db, 'partners', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `partners/${id}`);
    }
  };

  const moderateUserProfile = async (
    uid: string,
    patch: {
      showPublicly?: boolean;
      bio?: string;
      photoURL?: string;
      bannerURL?: string;
    }
  ) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const updatePayload: Record<string, unknown> = {};
    if (patch.showPublicly !== undefined) updatePayload.showPublicly = patch.showPublicly;
    if (patch.bio !== undefined) updatePayload.bio = patch.bio.slice(0, 120);
    if (patch.photoURL !== undefined) updatePayload.photoURL = patch.photoURL.slice(0, 1000);
    if (patch.bannerURL !== undefined) updatePayload.bannerURL = patch.bannerURL.slice(0, 1000);

    try {
      await updateDoc(doc(db, 'users', uid), updatePayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const resolveProfileReport = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await updateDoc(doc(db, 'reports', id), { status: 'resolved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const deleteProfileReport = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${id}`);
    }
  };

  const saveReward = async (payload: {
    id?: string;
    month: string;
    rank: 1 | 2 | 3;
    rewardName: string;
    claimed: boolean;
  }) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const rewardId = payload.id || `rw_${payload.month}_rank${payload.rank}`;
    const cleanPayload: Omit<RewardEntry, 'id'> = {
      month: payload.month.trim().slice(0, 30),
      rank: payload.rank,
      rewardName: payload.rewardName.trim().slice(0, 140),
      claimed: payload.claimed,
    };

    const isExistingFs = fsRewards.some((rw) => rw.id === rewardId);
    try {
      if (isExistingFs) {
        await updateDoc(doc(db, 'rewards', rewardId), cleanPayload);
      } else {
        await setDoc(doc(db, 'rewards', rewardId), cleanPayload);
      }
    } catch (err) {
      handleFirestoreError(
        err,
        isExistingFs ? OperationType.UPDATE : OperationType.CREATE,
        `rewards/${rewardId}`
      );
    }
  };

  const deleteReward = async (id: string) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    try {
      await deleteDoc(doc(db, 'rewards', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `rewards/${id}`);
    }
  };

  const updateSiteSettings = async (payload: SiteSettings) => {
    if (!isAdmin || !firebaseUser) return;
    setError(null);

    const cleanTeam: TeamMember[] = (payload.teamMembers || DEFAULT_TEAM_MEMBERS)
      .map((m) => ({
        name: m.name.trim().slice(0, 80),
        role: m.role.trim().slice(0, 60),
        instagramUrl: m.instagramUrl.trim().slice(0, 500),
        ...(m.photoURL ? { photoURL: m.photoURL.trim().slice(0, 1000) } : {}),
      }))
      .filter((m) => m.name.length > 0)
      .slice(0, 10);

    const cleanPhones: string[] = (payload.contactPhones || DEFAULT_CONTACT_PHONES)
      .map((p) => p.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 5);

    const clean: SiteSettings = {
      registrationUrl: payload.registrationUrl.trim().slice(0, 500),
      whatsappUrl: payload.whatsappUrl.trim().slice(0, 500),
      instagramUrl: (payload.instagramUrl || '').trim().slice(0, 500),
      teamMembers: cleanTeam,
      contactPhones: cleanPhones,
    };

    try {
      await setDoc(doc(db, 'settings', 'site'), clean);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    }
  };

  return (
    <ClubContext.Provider
      value={{
        loading,
        error,
        clearError: () => setError(null),
        firebaseUser,
        currentUser,
        needsOnboarding,
        isAdmin,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        completeOnboarding,
        updateMyProfile,
        updateMyProfileMedia,
        signOut,
        deleteMyAccount,
        users,
        runs,
        approvedRuns,
        pendingRuns,
        events,
        collabs,
        activeCollabs,
        announcements,
        voices,
        memories,
        partners,
        reports,
        rewards,
        siteSettings,
        currentMonthPrefix,
        leaderboardAllTime: allRunnerStatsMap.leaderboardAllTime,
        leaderboardThisMonth: allRunnerStatsMap.leaderboardThisMonth,
        getRunnerStats,
        getApprovedKmForUser,
        submitPendingRun,
        submitProfileReport,
        addRun,
        updateRun,
        approveRun,
        rejectRun,
        deleteRun,
        saveEvent,
        deleteEvent,
        saveCollab,
        toggleCollabActive,
        reorderCollab,
        deleteCollab,
        saveAnnouncement,
        deleteAnnouncement,
        saveVoiceQuote,
        deleteVoiceQuote,
        saveMemoryAlbum,
        deleteMemoryAlbum,
        savePartnerEntry,
        deletePartnerEntry,
        moderateUserProfile,
        resolveProfileReport,
        deleteProfileReport,
        saveReward,
        deleteReward,
        updateSiteSettings,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = (): ClubContextValue => {
  const ctx = useContext(ClubContext);
  if (!ctx) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return ctx;
};
