import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Upload } from 'lucide-react';
import { useClub } from '../context/ClubContext';
import {
  AnnouncementEntry,
  ClubEvent,
  CollabEntry,
  EventActivity,
  EventStatus,
  RunType,
  TeamMember,
  UserProfile,
} from '../types';
import { formatDuration, formatPaceMinPerKm } from './RecordPage';
import { formatPostedDate } from './HomePage';
import { EventDetailView } from './RunDetailPage';
import { Avatar } from '../components/Avatar';
import { DoodleSquiggle } from '../components/Doodles';
import { CollabSlideCard } from '../components/CollabSlide';
import { uploadCollabLogoImage } from '../lib/firebase';

type AdminTab = 'runs' | 'collabs' | 'updates' | 'approvals' | 'runners' | 'rewards';

interface FeedbackBanner {
  type: 'success' | 'error';
  message: string;
}

export const AdminPage: React.FC = () => {
  const {
    isAdmin,
    users,
    pendingRuns,
    events,
    collabs,
    announcements,
    voices,
    memories,
    partners,
    reports,
    rewards,
    siteSettings,
    currentMonthPrefix,
    getApprovedKmForUser,
    addRun,
    approveRun,
    rejectRun,
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
    updateSiteSettings,
  } = useClub();

  const [activeTab, setActiveTab] = useState<AdminTab>('runs');
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // --- TAB 1: RUNS (Events) STATE ---
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);

  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [evtTime, setEvtTime] = useState('6:00 AM');
  const [evtVenue, setEvtVenue] = useState(
    "Vijay Villas Sports (MP's first 360 degree turf)"
  );
  const [evtVenueMapUrl, setEvtVenueMapUrl] = useState('');
  const [evtBannerUrl, setEvtBannerUrl] = useState('');
  const [evtIntro, setEvtIntro] = useState('');
  const [evtMainRunLabel, setEvtMainRunLabel] = useState('3K community run');
  const [evtActivities, setEvtActivities] = useState<EventActivity[]>([]);
  const [newActName, setNewActName] = useState('');
  const [newActDetail, setNewActDetail] = useState('');
  const [evtSpecialMentionTitle, setEvtSpecialMentionTitle] = useState('');
  const [evtSpecialMentionText, setEvtSpecialMentionText] = useState('');
  const [evtSpecialMentionLogoUrl, setEvtSpecialMentionLogoUrl] = useState('');
  const [evtSafetyNote, setEvtSafetyNote] = useState('');
  const [evtFeeText, setEvtFeeText] = useState('');
  const [evtFeatured, setEvtFeatured] = useState(true);
  const [evtCity, setEvtCity] = useState('Rewa');
  const [evtDistance, setEvtDistance] = useState('3');
  const [evtFeeMale, setEvtFeeMale] = useState('');
  const [evtFeeFemale, setEvtFeeFemale] = useState('');
  const [evtFeeCouple, setEvtFeeCouple] = useState('');
  const [evtIncludedLines, setEvtIncludedLines] = useState<string[]>([]);
  const [newIncludedLine, setNewIncludedLine] = useState('');
  const [evtRegUrl, setEvtRegUrl] = useState('');
  const [evtStatus, setEvtStatus] = useState<EventStatus>('upcoming');
  const [evtDescription, setEvtDescription] = useState('');
  const [evtFormError, setEvtFormError] = useState<string | null>(null);

  // --- TAB 2: COLLABS STATE ---
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [colPartnerName, setColPartnerName] = useState('');
  const [colLogoUrl, setColLogoUrl] = useState('');
  const [colTitle, setColTitle] = useState('');
  const [colDateLabel, setColDateLabel] = useState('This Sunday');
  const [colActive, setColActive] = useState(true);
  const [colOrder, setColOrder] = useState('1');
  const [colPreviewKey, setColPreviewKey] = useState(0);
  const [uploadingCollabLogo, setUploadingCollabLogo] = useState(false);
  const [collabLogoProgress, setCollabLogoProgress] = useState(0);
  const collabLogoInputRef = useRef<HTMLInputElement | null>(null);

  // --- TAB 3: UPDATES, VOICES, MEMORIES & PARTNERS STATE ---
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [updatePinned, setUpdatePinned] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [voiceQuoteInput, setVoiceQuoteInput] = useState('');
  const [voiceRunnerInput, setVoiceRunnerInput] = useState('');
  const [voiceTagInput, setVoiceTagInput] = useState('Sunday Regular');

  const [memTitleInput, setMemTitleInput] = useState('');
  const [memDateInput, setMemDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [memPhotoInput, setMemPhotoInput] = useState('/club-photo.jpg');
  const [memLinkInput, setMemLinkInput] = useState('');

  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [partnerWebInput, setPartnerWebInput] = useState('');

  // --- TAB 4: APPROVALS STATE ---
  const [selectedRunnerUid, setSelectedRunnerUid] = useState(users[0]?.uid || '');
  const [manualRunDate, setManualRunDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [manualRunKm, setManualRunKm] = useState('5');
  const [manualRunType, setManualRunType] = useState<RunType>('Club run');

  // --- TAB 5: RUNNERS STATE ---
  const [runnerSearch, setRunnerSearch] = useState('');

  // --- TAB 6: REWARDS AND SETTINGS STATE ---
  const [rank1Text, setRank1Text] = useState('');
  const [rank1Claimed, setRank1Claimed] = useState(false);
  const [rank2Text, setRank2Text] = useState('');
  const [rank2Claimed, setRank2Claimed] = useState(false);
  const [rank3Text, setRank3Text] = useState('');
  const [rank3Claimed, setRank3Claimed] = useState(false);

  const [regUrlInput, setRegUrlInput] = useState(siteSettings.registrationUrl);
  const [waUrlInput, setWaUrlInput] = useState(siteSettings.whatsappUrl);
  const [igUrlInput, setIgUrlInput] = useState(siteSettings.instagramUrl || '');
  const [teamRows, setTeamRows] = useState<TeamMember[]>(siteSettings.teamMembers || []);
  const [phone1Input, setPhone1Input] = useState(
    siteSettings.contactPhones?.[0] || '90981 76793'
  );
  const [phone2Input, setPhone2Input] = useState(
    siteSettings.contactPhones?.[1] || '78287 79901'
  );

  useEffect(() => {
    if (!selectedRunnerUid && users.length > 0) {
      setSelectedRunnerUid(users[0].uid);
    }
  }, [users, selectedRunnerUid]);

  useEffect(() => {
    setRegUrlInput(siteSettings.registrationUrl);
    setWaUrlInput(siteSettings.whatsappUrl);
    setIgUrlInput(siteSettings.instagramUrl || '');
    setTeamRows(siteSettings.teamMembers || []);
    setPhone1Input(siteSettings.contactPhones?.[0] || '90981 76793');
    setPhone2Input(siteSettings.contactPhones?.[1] || '78287 79901');
  }, [siteSettings]);

  const monthRewardsMap = useMemo(() => {
    const r1 = rewards.find((r) => r.month === currentMonthPrefix && r.rank === 1);
    const r2 = rewards.find((r) => r.month === currentMonthPrefix && r.rank === 2);
    const r3 = rewards.find((r) => r.month === currentMonthPrefix && r.rank === 3);
    return { r1, r2, r3 };
  }, [rewards, currentMonthPrefix]);

  useEffect(() => {
    setRank1Text(monthRewardsMap.r1?.rewardName || '');
    setRank1Claimed(Boolean(monthRewardsMap.r1?.claimed));
    setRank2Text(monthRewardsMap.r2?.rewardName || '');
    setRank2Claimed(Boolean(monthRewardsMap.r2?.claimed));
    setRank3Text(monthRewardsMap.r3?.rewardName || '');
    setRank3Claimed(Boolean(monthRewardsMap.r3?.claimed));
  }, [monthRewardsMap]);

  if (!isAdmin) {
    return (
      <div className="px-4 py-8 space-y-4">
        <span className="label-sm text-[var(--accent)]">Restricted</span>
        <h1 className="font-display text-[34px] text-[var(--text)]">Admins only</h1>
        <p className="text-[16px] text-[var(--muted)]">
          Only FRST Run Club admins can view this page.
        </p>
        <Link
          to="/profile"
          className="min-h-[44px] inline-flex items-center gap-1.5 text-small font-semibold text-[var(--accent)] underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to profile</span>
        </Link>
      </div>
    );
  }

  // --- TAB 1 HANDLERS: RUNS (Events) ---
  const resetEventForm = () => {
    setEditingEventId(null);
    setEvtTitle('');
    setEvtDate(new Date().toISOString().slice(0, 10));
    setEvtTime('6:00 AM');
    setEvtVenue("Vijay Villas Sports (MP's first 360 degree turf)");
    setEvtVenueMapUrl('');
    setEvtBannerUrl('');
    setEvtIntro('');
    setEvtMainRunLabel('3K community run');
    setEvtActivities([]);
    setNewActName('');
    setNewActDetail('');
    setEvtSpecialMentionTitle('');
    setEvtSpecialMentionText('');
    setEvtSpecialMentionLogoUrl('');
    setEvtSafetyNote('');
    setEvtFeeText('');
    setEvtFeatured(false);
    setEvtCity('Rewa');
    setEvtDistance('3');
    setEvtFeeMale('');
    setEvtFeeFemale('');
    setEvtFeeCouple('');
    setEvtIncludedLines([]);
    setNewIncludedLine('');
    setEvtRegUrl('');
    setEvtStatus('upcoming');
    setEvtDescription('');
    setEvtFormError(null);
  };

  const openAddEventForm = () => {
    resetEventForm();
    setShowEventForm(true);
  };

  const openEditEvent = (evt: ClubEvent) => {
    setEditingEventId(evt.id);
    setEvtTitle(evt.title);
    setEvtDate(evt.date);
    setEvtTime(evt.time);
    setEvtVenue(evt.venueName || evt.venue || '');
    setEvtVenueMapUrl(evt.venueMapUrl || '');
    setEvtBannerUrl(evt.bannerUrl || '');
    setEvtIntro(evt.intro || evt.description || '');
    setEvtMainRunLabel(evt.mainRunLabel || `${evt.distanceKm}K community run`);
    setEvtActivities(evt.activities ? evt.activities.map((a) => ({ ...a })) : []);
    setNewActName('');
    setNewActDetail('');
    setEvtSpecialMentionTitle(evt.specialMentionTitle || '');
    setEvtSpecialMentionText(evt.specialMentionText || '');
    setEvtSpecialMentionLogoUrl(evt.specialMentionLogoUrl || '');
    setEvtSafetyNote(evt.safetyNote || '');
    setEvtFeeText(evt.feeText || '');
    setEvtFeatured(Boolean(evt.featured));
    setEvtCity(evt.city || 'Rewa');
    setEvtDistance(String(evt.distanceKm));
    setEvtFeeMale(evt.fee?.male > 0 ? String(evt.fee.male) : '');
    setEvtFeeFemale(evt.fee?.female > 0 ? String(evt.fee.female) : '');
    setEvtFeeCouple(evt.fee?.couple > 0 ? String(evt.fee.couple) : '');
    setEvtIncludedLines(evt.perks && evt.perks.length > 0 ? [...evt.perks] : []);
    setNewIncludedLine('');
    setEvtRegUrl(evt.registrationUrl || '');
    setEvtStatus(evt.status || 'upcoming');
    setEvtDescription(evt.description || '');
    setEvtFormError(null);
    setShowEventForm(true);
  };

  const handleDuplicateEvent = async (evt: ClubEvent) => {
    try {
      await saveEvent({
        title: `${evt.title} (Copy)`,
        date: evt.date,
        time: evt.time,
        venue: evt.venueName || evt.venue,
        venueName: evt.venueName || evt.venue,
        venueMapUrl: evt.venueMapUrl || '',
        bannerUrl: evt.bannerUrl || '',
        intro: evt.intro || '',
        mainRunLabel: evt.mainRunLabel || '',
        activities: evt.activities ? evt.activities.map((a) => ({ ...a })) : [],
        specialMentionTitle: evt.specialMentionTitle || '',
        specialMentionText: evt.specialMentionText || '',
        specialMentionLogoUrl: evt.specialMentionLogoUrl || '',
        safetyNote: evt.safetyNote || '',
        feeText: evt.feeText || '',
        featured: false,
        city: evt.city || 'Rewa',
        distanceKm: evt.distanceKm,
        fee: { ...(evt.fee || { male: 0, female: 0, couple: 0 }) },
        perks: [...(evt.perks || [])],
        registrationUrl: evt.registrationUrl || '',
        status: evt.status || 'upcoming',
        description: evt.description || '',
      });
      showFeedback('success', 'Run event duplicated.');
    } catch {
      showFeedback('error', 'Could not duplicate run event.');
    }
  };

  const handleConfirmDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
      setConfirmDeleteEventId(null);
      showFeedback('success', 'Run event deleted.');
    } catch {
      showFeedback('error', 'Could not delete run event.');
    }
  };

  const handleAddActivity = () => {
    const trimmedName = newActName.trim();
    if (!trimmedName) {
      setEvtFormError('Enter an activity name before adding.');
      return;
    }
    if (evtActivities.length >= 20) {
      setEvtFormError('Maximum 20 activities allowed.');
      return;
    }
    setEvtFormError(null);
    setEvtActivities((prev) => [
      ...prev,
      {
        name: trimmedName.slice(0, 100),
        detail: newActDetail.trim().slice(0, 160),
      },
    ]);
    setNewActName('');
    setNewActDetail('');
  };

  const handleMoveActivity = (idx: number, direction: 'up' | 'down') => {
    setEvtActivities((prev) => {
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[swapIdx];
      next[swapIdx] = temp;
      return next;
    });
  };

  const handleRemoveActivity = (idx: number) => {
    setEvtActivities((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateActivityField = (
    idx: number,
    field: 'name' | 'detail',
    val: string
  ) => {
    setEvtActivities((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvtFormError(null);

    if (!evtTitle.trim()) {
      setEvtFormError('Please enter a run title.');
      return;
    }
    if (!evtDate || evtDate.length !== 10) {
      setEvtFormError('Please choose a valid date (YYYY-MM-DD).');
      return;
    }
    if (!evtTime.trim()) {
      setEvtFormError('Please enter a start time.');
      return;
    }
    if (!evtVenue.trim()) {
      setEvtFormError('Please enter a venue name.');
      return;
    }
    if (evtIntro.trim().length > 240) {
      setEvtFormError('Intro must be 240 characters or less.');
      return;
    }
    const distNum = parseFloat(evtDistance);
    if (Number.isNaN(distNum) || distNum <= 0 || distNum > 200) {
      setEvtFormError('Distance must be between 0.5 km and 200 km.');
      return;
    }

    const pendingActName = newActName.trim();
    const finalActivities = pendingActName
      ? [
          ...evtActivities,
          {
            name: pendingActName.slice(0, 100),
            detail: newActDetail.trim().slice(0, 160),
          },
        ]
      : evtActivities;

    const pendingLine = newIncludedLine.trim();
    const finalPerks = pendingLine
      ? [...evtIncludedLines, pendingLine.slice(0, 80)]
      : evtIncludedLines;

    try {
      await saveEvent({
        id: editingEventId || undefined,
        title: evtTitle.trim(),
        date: evtDate,
        time: evtTime.trim(),
        venue: evtVenue.trim(),
        venueName: evtVenue.trim(),
        venueMapUrl: evtVenueMapUrl.trim(),
        bannerUrl: evtBannerUrl.trim(),
        intro: evtIntro.trim().slice(0, 240),
        mainRunLabel: evtMainRunLabel.trim(),
        activities: finalActivities,
        specialMentionTitle: evtSpecialMentionTitle.trim(),
        specialMentionText: evtSpecialMentionText.trim(),
        specialMentionLogoUrl: evtSpecialMentionLogoUrl.trim(),
        safetyNote: evtSafetyNote.trim(),
        feeText: evtFeeText.trim(),
        featured: evtFeatured,
        city: evtCity.trim() || 'Rewa',
        distanceKm: distNum,
        fee: {
          male: evtFeeMale.trim() ? Math.max(0, parseFloat(evtFeeMale) || 0) : 0,
          female: evtFeeFemale.trim() ? Math.max(0, parseFloat(evtFeeFemale) || 0) : 0,
          couple: evtFeeCouple.trim() ? Math.max(0, parseFloat(evtFeeCouple) || 0) : 0,
        },
        perks: finalPerks,
        registrationUrl: evtRegUrl.trim(),
        status: evtStatus,
        description: evtDescription.trim(),
      });
      showFeedback(
        'success',
        editingEventId ? 'Run event updated.' : 'Run event added.'
      );
      resetEventForm();
      setShowEventForm(false);
    } catch {
      showFeedback('error', 'Failed to save run event. Check fields and try again.');
    }
  };

  const getEffectiveStatus = (evt: ClubEvent): EventStatus => {
    if (evt.status) return evt.status;
    const today = new Date().toISOString().slice(0, 10);
    return evt.date >= today ? 'upcoming' : 'past';
  };

  const previewEventObj: ClubEvent = {
    id: editingEventId || 'preview_event',
    title: evtTitle.trim() || 'Vijay Villas Sports x FRST Run Club',
    date: evtDate,
    time: evtTime.trim() || '6:00 AM',
    venue: evtVenue.trim() || "Vijay Villas Sports (MP's first 360 degree turf)",
    venueName: evtVenue.trim() || "Vijay Villas Sports (MP's first 360 degree turf)",
    venueMapUrl: evtVenueMapUrl.trim(),
    bannerUrl: evtBannerUrl.trim(),
    intro: evtIntro.trim(),
    mainRunLabel: evtMainRunLabel.trim() || `${evtDistance || 3}K community run`,
    activities: evtActivities,
    specialMentionTitle: evtSpecialMentionTitle.trim(),
    specialMentionText: evtSpecialMentionText.trim(),
    specialMentionLogoUrl: evtSpecialMentionLogoUrl.trim(),
    safetyNote: evtSafetyNote.trim(),
    feeText: evtFeeText.trim(),
    featured: evtFeatured,
    city: evtCity.trim() || 'Rewa',
    distanceKm: parseFloat(evtDistance) || 3,
    fee: {
      male: parseFloat(evtFeeMale) || 0,
      female: parseFloat(evtFeeFemale) || 0,
      couple: parseFloat(evtFeeCouple) || 0,
    },
    perks: evtIncludedLines,
    registrationUrl: evtRegUrl.trim(),
    status: evtStatus,
    description: evtDescription.trim(),
  };

  // --- TAB 2 HANDLERS: COLLABS ---
  const resetCollabForm = () => {
    setEditingCollabId(null);
    setColPartnerName('');
    setColLogoUrl('');
    setColTitle('');
    setColDateLabel('This Sunday');
    setColActive(true);
    setColOrder(String(collabs.length + 1));
    setColPreviewKey((k) => k + 1);
  };

  const openAddCollabForm = () => {
    resetCollabForm();
    setShowCollabForm(true);
  };

  const openEditCollab = (c: CollabEntry) => {
    setEditingCollabId(c.id);
    setColPartnerName(c.partnerName);
    setColLogoUrl(c.logoUrl || '');
    setColTitle(c.title);
    setColDateLabel(c.dateLabel ?? '');
    setColActive(c.active);
    setColOrder(String(c.order));
    setColPreviewKey((k) => k + 1);
    setShowCollabForm(true);
  };

  const handleCollabLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingCollabLogo(true);
    setCollabLogoProgress(10);
    try {
      const targetId = editingCollabId || `col_${Date.now()}`;
      if (!editingCollabId) setEditingCollabId(targetId);
      const url = await uploadCollabLogoImage(targetId, file, (pct) =>
        setCollabLogoProgress(pct)
      );
      setColLogoUrl(url);
      showFeedback('success', 'Partner logo uploaded (square, under 100 KB).');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not upload logo.';
      showFeedback('error', msg);
    } finally {
      setUploadingCollabLogo(false);
    }
  };

  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colPartnerName.trim() || !colTitle.trim()) {
      showFeedback('error', 'Partner name and title are required.');
      return;
    }

    try {
      await saveCollab({
        id: editingCollabId || undefined,
        partnerName: colPartnerName.trim(),
        logoUrl: colLogoUrl.trim(),
        title: colTitle.trim(),
        dateLabel: colDateLabel.trim(),
        active: colActive,
        order: Math.max(0, parseInt(colOrder, 10) || 1),
      });
      showFeedback('success', 'Collaboration saved.');
      resetCollabForm();
      setShowCollabForm(false);
    } catch {
      showFeedback('error', 'Could not save collaboration.');
    }
  };

  // --- TAB 3 HANDLERS: UPDATES (Announcements) ---
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);
    const trimmed = updateText.trim();
    if (!trimmed) {
      setUpdateError('Please write an announcement before posting.');
      return;
    }
    if (trimmed.length > 200) {
      setUpdateError('Announcement must be 200 characters or less.');
      return;
    }
    try {
      await saveAnnouncement({
        id: editingUpdateId || undefined,
        text: trimmed,
        pinned: updatePinned,
      });
      showFeedback(
        'success',
        editingUpdateId ? 'Announcement updated.' : 'Announcement posted to Home.'
      );
      setEditingUpdateId(null);
      setUpdateText('');
      setUpdatePinned(true);
    } catch {
      showFeedback('error', 'Could not save announcement.');
    }
  };

  const startEditAnnouncement = (ann: AnnouncementEntry) => {
    setEditingUpdateId(ann.id);
    setUpdateText(ann.text);
    setUpdatePinned(ann.pinned);
    setUpdateError(null);
  };

  const handleTogglePinAnnouncement = async (ann: AnnouncementEntry) => {
    try {
      await saveAnnouncement({
        id: ann.id,
        text: ann.text,
        pinned: !ann.pinned,
      });
      showFeedback('success', !ann.pinned ? 'Announcement pinned.' : 'Announcement unpinned.');
    } catch {
      showFeedback('error', 'Could not update pin state.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      if (editingUpdateId === id) {
        setEditingUpdateId(null);
        setUpdateText('');
      }
      showFeedback('success', 'Announcement deleted.');
    } catch {
      showFeedback('error', 'Could not delete announcement.');
    }
  };

  // --- TAB 4 HANDLERS: APPROVALS ---
  const getRunnerName = (uid: string) =>
    users.find((u) => u.uid === uid)?.displayName || uid;

  const isRunFlagged = (km: number, durationSeconds?: number) => {
    if (km > 25) return { flagged: true, reason: 'Distance over 25 km' };
    if (durationSeconds && durationSeconds > 0 && km > 0) {
      const paceSecPerKm = durationSeconds / km;
      if (paceSecPerKm < 180) {
        return { flagged: true, reason: 'Pace faster than 3:00 min/km' };
      }
    }
    return { flagged: false, reason: '' };
  };

  const handleApproveRun = async (id: string) => {
    try {
      await approveRun(id);
      showFeedback('success', 'Run approved and added to leaderboard.');
    } catch {
      showFeedback('error', 'Could not approve run.');
    }
  };

  const handleRejectRun = async (id: string) => {
    try {
      await rejectRun(id);
      showFeedback('success', 'Run rejected.');
    } catch {
      showFeedback('error', 'Could not reject run.');
    }
  };

  const handleAddManualApprovedRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = parseFloat(manualRunKm);
    if (!selectedRunnerUid) {
      showFeedback('error', 'Please choose a runner.');
      return;
    }
    if (Number.isNaN(kmNum) || kmNum <= 0 || kmNum > 500) {
      showFeedback('error', 'Enter a valid distance between 0.5 and 500 km.');
      return;
    }
    try {
      await addRun({
        uid: selectedRunnerUid,
        date: manualRunDate,
        km: kmNum,
        type: manualRunType,
      });
      setManualRunKm('5');
      showFeedback('success', 'Approved run added for runner.');
    } catch {
      showFeedback('error', 'Could not add run for runner.');
    }
  };

  // --- TAB 5 HANDLERS: RUNNERS ---
  const filteredRunners = useMemo(() => {
    const q = runnerSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.displayName.toLowerCase().includes(q));
  }, [users, runnerSearch]);

  const handleToggleLeaderboardVisibility = async (u: UserProfile) => {
    try {
      await moderateUserProfile(u.uid, { showPublicly: !u.showPublicly });
      showFeedback(
        'success',
        !u.showPublicly
          ? `${u.displayName} is now visible on leaderboard.`
          : `${u.displayName} hidden from leaderboard.`
      );
    } catch {
      showFeedback('error', 'Could not update runner visibility.');
    }
  };

  const handleClearRunnerBio = async (u: UserProfile) => {
    try {
      await moderateUserProfile(u.uid, { bio: '' });
      showFeedback('success', `Cleared bio for ${u.displayName}.`);
    } catch {
      showFeedback('error', 'Could not clear bio.');
    }
  };

  const handleRemoveRunnerPhotoBanner = async (u: UserProfile) => {
    try {
      await moderateUserProfile(u.uid, { photoURL: '', bannerURL: '' });
      showFeedback('success', `Removed photo and banner for ${u.displayName}.`);
    } catch {
      showFeedback('error', 'Could not remove photo or banner.');
    }
  };

  const handleResolveReport = async (id: string) => {
    try {
      await resolveProfileReport(id);
      showFeedback('success', 'Report marked as resolved.');
    } catch {
      showFeedback('error', 'Could not resolve report.');
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteProfileReport(id);
      showFeedback('success', 'Report removed.');
    } catch {
      showFeedback('error', 'Could not delete report.');
    }
  };

  // --- TAB 6 HANDLERS: REWARDS AND SETTINGS ---
  const handleSavePositionReward = async (
    rank: 1 | 2 | 3,
    text: string,
    claimed: boolean,
    existingId?: string
  ) => {
    if (!text.trim()) {
      showFeedback('error', `Please enter reward text for #${rank}.`);
      return;
    }
    try {
      await saveReward({
        id: existingId,
        month: currentMonthPrefix,
        rank,
        rewardName: text.trim(),
        claimed,
      });
      showFeedback('success', `Saved #${rank} reward.`);
    } catch {
      showFeedback('error', `Could not save #${rank} reward.`);
    }
  };

  const handleTeamFieldChange = (
    idx: number,
    field: keyof TeamMember,
    val: string
  ) => {
    setTeamRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );
  };

  const handleAddTeamRow = () => {
    if (teamRows.length >= 10) return;
    setTeamRows((prev) => [
      ...prev,
      { name: '', role: '', instagramUrl: 'https://www.instagram.com/' },
    ]);
  };

  const handleRemoveTeamRow = (idx: number) => {
    setTeamRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const phones = [phone1Input.trim(), phone2Input.trim()].filter(Boolean);
      await updateSiteSettings({
        registrationUrl: regUrlInput.trim(),
        whatsappUrl: waUrlInput.trim(),
        instagramUrl: igUrlInput.trim(),
        teamMembers: teamRows.filter((t) => t.name.trim().length > 0),
        contactPhones: phones,
      });
      showFeedback('success', 'Links, team members, and phone numbers saved.');
    } catch {
      showFeedback('error', 'Could not save settings.');
    }
  };

  const tabs: { id: AdminTab; label: string; count?: number }[] = [
    { id: 'runs', label: 'Runs' },
    { id: 'collabs', label: 'Collabs', count: collabs.length },
    { id: 'updates', label: 'Updates' },
    { id: 'approvals', label: 'Approvals', count: pendingRuns.length },
    { id: 'runners', label: 'Runners' },
    { id: 'rewards', label: 'Settings' },
  ];

  return (
    <div className="px-4 py-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <Link
            to="/profile"
            className="min-h-[40px] inline-flex items-center gap-1.5 text-small font-semibold text-[var(--accent)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to profile</span>
          </Link>
          <span className="label-sm">Admin</span>
        </div>
        <div className="space-y-1">
          <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
            FRST Run Club Admin
          </h1>
          <DoodleSquiggle className="w-36 h-3" />
        </div>
      </header>

      {/* Top Tabs */}
      <nav
        aria-label="Admin sections"
        className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4"
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`h-[38px] px-3.5 rounded-[10px] text-small font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 border transition-colors ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                  : 'bg-[var(--card)] text-[var(--text)] border-[var(--divider)]'
              }`}
            >
              <span>{t.label}</span>
              {typeof t.count === 'number' && t.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--bg)] text-[var(--text)] text-[11px] font-bold">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className="club-card p-3.5 flex items-center justify-between gap-2"
        >
          <span
            className={`text-small font-semibold ${
              feedback.type === 'error' ? 'text-[var(--accent)]' : 'text-[var(--text)]'
            }`}
          >
            {feedback.message}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================
          TAB 1: RUNS (EVENTS)
         ========================================================= */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              Club Runs ({events.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                if (showEventForm && !editingEventId) {
                  setShowEventForm(false);
                } else {
                  openAddEventForm();
                }
              }}
              className="btn-secondary-sm"
            >
              {showEventForm && !editingEventId ? 'Close form' : 'Add run'}
            </button>
          </div>

          {showEventForm && (
            <div className="space-y-5">
              <form onSubmit={handleEventSubmit} className="club-card p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[22px] text-[var(--text)]">
                    {editingEventId ? 'Edit Run Event' : 'Add New Run Event'}
                  </span>
                  <div className="flex items-center gap-2">
                    {editingEventId && (
                      <button
                        type="button"
                        onClick={() => handleDuplicateEvent(previewEventObj)}
                        className="btn-secondary-sm"
                      >
                        Duplicate event
                      </button>
                    )}
                    <span className="label-sm text-[var(--accent)]">{evtStatus}</span>
                  </div>
                </div>

                {evtFormError && (
                  <div className="p-3 rounded-[10px] border border-[var(--divider)] text-small font-semibold text-[var(--accent)]">
                    {evtFormError}
                  </div>
                )}

                <div>
                  <label htmlFor="evt-title" className="block label-sm mb-1.5">
                    Title *
                  </label>
                  <input
                    id="evt-title"
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Vijay Villas Sports x FRST Run Club"
                    value={evtTitle}
                    onChange={(e) => setEvtTitle(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div>
                  <label htmlFor="evt-banner" className="block label-sm mb-1.5">
                    Banner photo URL (optional — shows doodle pattern if empty)
                  </label>
                  <input
                    id="evt-banner"
                    type="text"
                    maxLength={1000}
                    placeholder="/club-photo.jpg or https://..."
                    value={evtBannerUrl}
                    onChange={(e) => setEvtBannerUrl(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="evt-date" className="block label-sm mb-1.5">
                      Date *
                    </label>
                    <input
                      id="evt-date"
                      type="date"
                      required
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="evt-time" className="block label-sm mb-1.5">
                      Start time *
                    </label>
                    <input
                      id="evt-time"
                      type="text"
                      required
                      maxLength={30}
                      placeholder="6:00 AM"
                      value={evtTime}
                      onChange={(e) => setEvtTime(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label htmlFor="evt-dist" className="block label-sm mb-1.5">
                      Distance (km) *
                    </label>
                    <input
                      id="evt-dist"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="200"
                      required
                      value={evtDistance}
                      onChange={(e) => setEvtDistance(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="evt-city" className="block label-sm mb-1.5">
                      City
                    </label>
                    <input
                      id="evt-city"
                      type="text"
                      maxLength={60}
                      placeholder="Rewa"
                      value={evtCity}
                      onChange={(e) => setEvtCity(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="evt-status" className="block label-sm mb-1.5">
                      Status *
                    </label>
                    <select
                      id="evt-status"
                      value={evtStatus}
                      onChange={(e) => setEvtStatus(e.target.value as EventStatus)}
                      className="w-full h-[46px] club-input px-2"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="evt-main-run" className="block label-sm mb-1.5">
                      Main run label
                    </label>
                    <input
                      id="evt-main-run"
                      type="text"
                      maxLength={100}
                      placeholder="3K community run"
                      value={evtMainRunLabel}
                      onChange={(e) => setEvtMainRunLabel(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="evt-fee-text" className="block label-sm mb-1.5">
                      Fee text (optional)
                    </label>
                    <input
                      id="evt-fee-text"
                      type="text"
                      maxLength={100}
                      placeholder="Free or Rs 199"
                      value={evtFeeText}
                      onChange={(e) => setEvtFeeText(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="evt-venue" className="block label-sm mb-1.5">
                    Venue name *
                  </label>
                  <input
                    id="evt-venue"
                    type="text"
                    required
                    maxLength={160}
                    placeholder="Vijay Villas Sports (MP's first 360 degree turf)"
                    value={evtVenue}
                    onChange={(e) => setEvtVenue(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div>
                  <label htmlFor="evt-venue-map" className="block label-sm mb-1.5">
                    Venue map URL (optional)
                  </label>
                  <input
                    id="evt-venue-map"
                    type="url"
                    maxLength={500}
                    placeholder="https://maps.google.com/..."
                    value={evtVenueMapUrl}
                    onChange={(e) => setEvtVenueMapUrl(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="evt-intro" className="block label-sm">
                      Intro (max 240 chars)
                    </label>
                    <span className="text-[11px] text-[var(--muted)] tabular-nums">
                      {evtIntro.length}/240
                    </span>
                  </div>
                  <textarea
                    id="evt-intro"
                    rows={2}
                    maxLength={240}
                    placeholder="Our next run is on a turf. We will run 3K together, then stay for a morning of games and good energy."
                    value={evtIntro}
                    onChange={(e) => setEvtIntro(e.target.value.slice(0, 240))}
                    className="w-full club-input p-3"
                  />
                </div>

                {/* After the Run Activities (add, reorder, edit, remove) */}
                <div className="space-y-2.5 pt-1 border-t border-[var(--divider)]">
                  <span className="block label-sm">
                    After the run activities ({evtActivities.length})
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      maxLength={100}
                      placeholder="Activity name (e.g. Cricket)"
                      value={newActName}
                      onChange={(e) => setNewActName(e.target.value)}
                      className="w-full h-[42px] club-input px-3"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={160}
                        placeholder="Short detail (e.g. bowling machine up to 160 km/h)"
                        value={newActDetail}
                        onChange={(e) => setNewActDetail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddActivity();
                          }
                        }}
                        className="flex-1 h-[42px] club-input px-3"
                      />
                      <button
                        type="button"
                        onClick={handleAddActivity}
                        className="btn-secondary-sm shrink-0"
                      >
                        Add activity
                      </button>
                    </div>
                  </div>

                  {evtActivities.length > 0 && (
                    <ul className="space-y-2 pt-1">
                      {evtActivities.map((act, idx) => (
                        <li
                          key={idx}
                          className="p-2.5 rounded-[10px] border border-[var(--divider)] bg-[var(--bg)] space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={100}
                              value={act.name}
                              onChange={(e) =>
                                handleUpdateActivityField(idx, 'name', e.target.value)
                              }
                              aria-label={`Activity ${idx + 1} name`}
                              className="flex-1 h-[38px] club-input px-2.5 text-[14px]"
                            />
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveActivity(idx, 'up')}
                              aria-label="Move activity up"
                              className="btn-secondary-sm px-2.5 disabled:opacity-40"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === evtActivities.length - 1}
                              onClick={() => handleMoveActivity(idx, 'down')}
                              aria-label="Move activity down"
                              className="btn-secondary-sm px-2.5 disabled:opacity-40"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveActivity(idx)}
                              className="text-small font-semibold text-[var(--accent)] underline cursor-pointer shrink-0 px-1"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            maxLength={160}
                            placeholder="Optional short detail"
                            value={act.detail || ''}
                            onChange={(e) =>
                              handleUpdateActivityField(idx, 'detail', e.target.value)
                            }
                            aria-label={`Activity ${idx + 1} detail`}
                            className="w-full h-[36px] club-input px-2.5 text-[13px]"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Special Mention Section */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--divider)]">
                  <span className="block label-sm">Special mention (optional)</span>
                  <div>
                    <label
                      htmlFor="evt-sm-title"
                      className="block text-[12px] text-[var(--muted)] mb-1"
                    >
                      Special mention title
                    </label>
                    <input
                      id="evt-sm-title"
                      type="text"
                      maxLength={100}
                      placeholder="Horse riding zone"
                      value={evtSpecialMentionTitle}
                      onChange={(e) => setEvtSpecialMentionTitle(e.target.value)}
                      className="w-full h-[42px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="evt-sm-text"
                      className="block text-[12px] text-[var(--muted)] mb-1"
                    >
                      Special mention text
                    </label>
                    <textarea
                      id="evt-sm-text"
                      rows={2}
                      maxLength={300}
                      placeholder="A special mention to our premium sponsor. Details coming soon."
                      value={evtSpecialMentionText}
                      onChange={(e) => setEvtSpecialMentionText(e.target.value)}
                      className="w-full club-input p-3"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="evt-sm-logo"
                      className="block text-[12px] text-[var(--muted)] mb-1"
                    >
                      Special mention logo URL (optional — shows initials if empty)
                    </label>
                    <input
                      id="evt-sm-logo"
                      type="url"
                      maxLength={1000}
                      placeholder="https://..."
                      value={evtSpecialMentionLogoUrl}
                      onChange={(e) => setEvtSpecialMentionLogoUrl(e.target.value)}
                      className="w-full h-[42px] club-input px-3"
                    />
                  </div>
                </div>

                {/* Safety Note & Registration Link */}
                <div className="space-y-3 pt-2 border-t border-[var(--divider)]">
                  <div>
                    <label htmlFor="evt-safety" className="block label-sm mb-1.5">
                      Safety note (optional)
                    </label>
                    <textarea
                      id="evt-safety"
                      rows={2}
                      maxLength={300}
                      placeholder="Age and safety rules apply to some activities. Please follow the instructions of the venue staff."
                      value={evtSafetyNote}
                      onChange={(e) => setEvtSafetyNote(e.target.value)}
                      className="w-full club-input p-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="evt-reg" className="block label-sm mb-1.5">
                      Registration link (optional)
                    </label>
                    <input
                      id="evt-reg"
                      type="url"
                      maxLength={500}
                      placeholder="https://forms.gle/..."
                      value={evtRegUrl}
                      onChange={(e) => setEvtRegUrl(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                </div>

                {/* Featured ("This Sunday") Switch */}
                <div className="py-2.5 border-y border-[var(--divider)] flex items-center justify-between gap-3">
                  <label
                    htmlFor="evt-featured-switch"
                    className="text-[15px] text-[var(--text)] cursor-pointer"
                  >
                    Feature as &ldquo;This Sunday&rdquo; on Home
                  </label>
                  <button
                    id="evt-featured-switch"
                    type="button"
                    role="switch"
                    aria-checked={evtFeatured}
                    onClick={() => setEvtFeatured((v) => !v)}
                    className={`w-12 h-7 rounded-full border border-[var(--divider)] p-0.5 cursor-pointer shrink-0 transition-colors ${
                      evtFeatured ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full transition-transform ${
                        evtFeatured
                          ? 'translate-x-5 bg-[var(--on-accent)]'
                          : 'translate-x-0 bg-[var(--muted)]'
                      }`}
                    />
                  </button>
                </div>

                {/* Live Preview of the Event Details Page */}
                <div className="space-y-3 pt-2">
                  <span className="block label-sm text-[var(--accent)]">
                    Live preview of details page
                  </span>
                  <div className="rounded-[14px] border border-[var(--divider)] bg-[var(--bg)] p-3.5">
                    <EventDetailView event={previewEventObj} isPreview={true} />
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button type="submit" className="btn-primary">
                    {editingEventId ? 'Save changes' : 'Create run'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateEvent(previewEventObj)}
                    className="btn-secondary"
                  >
                    Duplicate event
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetEventForm();
                      setShowEventForm(false);
                    }}
                    className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {events.length === 0 ? (
            <div className="club-card p-4">
              <p className="text-[16px] text-[var(--muted)]">
                No upcoming runs. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => {
                const st = getEffectiveStatus(evt);
                const isConfirmingDelete = confirmDeleteEventId === evt.id;
                return (
                  <div key={evt.id} className="club-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {evt.featured && (
                            <span className="px-2 py-0.5 rounded-full border border-[var(--divider)] bg-[var(--bg)] text-[11px] font-semibold text-[var(--accent)]">
                              This Sunday
                            </span>
                          )}
                          <span className="label-sm text-[var(--accent)]">{st}</span>
                        </div>
                        <div className="font-display text-[22px] text-[var(--text)] leading-tight break-words">
                          {evt.title}
                        </div>
                        <div className="text-small font-medium text-[var(--muted)] tabular-nums">
                          {evt.date} · {evt.time} ·{' '}
                          {evt.mainRunLabel || `${evt.distanceKm} KM`} ·{' '}
                          {evt.city || 'Rewa'}
                        </div>
                        <div className="text-[15px] text-[var(--text)] break-words">
                          {evt.venueName || evt.venue}
                        </div>
                      </div>
                      <Link
                        to={`/runs/${evt.id}`}
                        className="text-[12px] font-semibold text-[var(--accent)] underline shrink-0"
                      >
                        View page
                      </Link>
                    </div>

                    {!isConfirmingDelete ? (
                      <div className="flex items-center gap-2.5 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => openEditEvent(evt)}
                          className="btn-secondary-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateEvent(evt)}
                          className="btn-secondary-sm"
                        >
                          Duplicate event
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteEventId(evt.id)}
                          className="btn-secondary-sm text-[var(--accent)]"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-[10px] border border-[var(--divider)] bg-[var(--bg)] space-y-2">
                        <p className="text-small font-semibold text-[var(--text)]">
                          Delete &ldquo;{evt.title}&rdquo;?
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteEvent(evt.id)}
                            className="btn-secondary-sm text-[var(--accent)]"
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteEventId(null)}
                            className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: COLLABS (Add, edit, reorder, hide, delete collaborations)
         ========================================================= */}
      {activeTab === 'collabs' && (
        <div className="space-y-6">
          <input
            ref={collabLogoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCollabLogoUpload}
            className="hidden"
          />

          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
                Collaborations ({collabs.length})
              </h2>
              <p className="text-[13px] text-[var(--muted)] mt-1">
                Shown in the swipeable Collab Slide on Home
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showCollabForm && !editingCollabId) {
                  setShowCollabForm(false);
                } else {
                  openAddCollabForm();
                }
              }}
              className="btn-secondary-sm shrink-0"
            >
              {showCollabForm && !editingCollabId ? 'Close form' : 'Add collab'}
            </button>
          </div>

          {showCollabForm && (
            <form onSubmit={handleCollabSubmit} className="club-card p-4 space-y-4">
              <div className="font-display text-[22px] text-[var(--text)]">
                {editingCollabId ? 'Edit Collaboration' : 'Add Collaboration'}
              </div>

              <div>
                <label htmlFor="col-partner" className="block label-sm mb-1.5">
                  Partner name *
                </label>
                <input
                  id="col-partner"
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Vijay Vilas Sports"
                  value={colPartnerName}
                  onChange={(e) => {
                    const nextPartner = e.target.value;
                    setColPartnerName(nextPartner);
                    if (!editingCollabId && !colTitle.trim() && nextPartner.trim()) {
                      setColTitle(
                        `${nextPartner.trim().toUpperCase()} X FRST RUN CLUB`
                      );
                    }
                  }}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              {/* Partner Logo Upload (square, max 300px, under 100 KB) */}
              <div className="space-y-2">
                <label htmlFor="col-logo-url" className="block label-sm">
                  Partner logo (square, max 300px, under 100 KB)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="col-logo-url"
                    type="url"
                    maxLength={1000}
                    placeholder="Upload square logo or paste URL"
                    value={colLogoUrl}
                    onChange={(e) => setColLogoUrl(e.target.value)}
                    className="flex-1 h-[42px] club-input px-3"
                  />
                  <button
                    type="button"
                    disabled={uploadingCollabLogo}
                    onClick={() => collabLogoInputRef.current?.click()}
                    className="btn-secondary-sm inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingCollabLogo
                        ? `${collabLogoProgress}%`
                        : 'Upload'}
                    </span>
                  </button>
                </div>
                {colLogoUrl && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <img
                      src={colLogoUrl}
                      alt={`${colPartnerName || 'Partner'} logo preview`}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 object-cover rounded-[8px] border border-[var(--divider)] bg-[var(--bg)]"
                    />
                    <button
                      type="button"
                      onClick={() => setColLogoUrl('')}
                      className="text-[12px] text-[var(--accent)] underline cursor-pointer"
                    >
                      Clear logo
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="col-title" className="block label-sm mb-1.5">
                  Title *
                </label>
                <input
                  id="col-title"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="VIJAY VILAS SPORTS X FRST RUN CLUB"
                  value={colTitle}
                  onChange={(e) => setColTitle(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="col-date" className="block label-sm mb-1.5">
                    Date chip text (optional)
                  </label>
                  <input
                    id="col-date"
                    type="text"
                    maxLength={60}
                    placeholder="This Sunday (or leave empty)"
                    value={colDateLabel}
                    onChange={(e) => setColDateLabel(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>
                <div>
                  <label htmlFor="col-order" className="block label-sm mb-1.5">
                    Order
                  </label>
                  <input
                    id="col-order"
                    type="number"
                    min="0"
                    max="999"
                    value={colOrder}
                    onChange={(e) => setColOrder(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>
              </div>

              <div className="py-2.5 border-y border-[var(--divider)] flex items-center justify-between gap-3">
                <label
                  htmlFor="col-active-switch"
                  className="text-[15px] text-[var(--text)] cursor-pointer"
                >
                  Active (show on Home)
                </label>
                <button
                  id="col-active-switch"
                  type="button"
                  role="switch"
                  aria-checked={colActive}
                  onClick={() => setColActive((v) => !v)}
                  className={`w-12 h-7 rounded-full border border-[var(--divider)] p-0.5 cursor-pointer shrink-0 transition-colors ${
                    colActive ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full transition-transform ${
                      colActive
                        ? 'translate-x-5 bg-[var(--on-accent)]'
                        : 'translate-x-0 bg-[var(--muted)]'
                    }`}
                  />
                </button>
              </div>

              {/* Live Motion-Graphics Slide Preview */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-sm">Live slide preview</span>
                  <button
                    type="button"
                    onClick={() => setColPreviewKey((k) => k + 1)}
                    className="text-[12px] font-semibold text-[var(--accent)] underline cursor-pointer"
                  >
                    Replay entrance
                  </button>
                </div>
                <CollabSlideCard
                  collab={{
                    partnerName: colPartnerName || 'Vijay Vilas Sports',
                    logoUrl: colLogoUrl,
                    title:
                      colTitle ||
                      `${(colPartnerName || 'VIJAY VILAS SPORTS').toUpperCase()} X FRST RUN CLUB`,
                    dateLabel: colDateLabel,
                  }}
                  isActiveSlide={true}
                  animKey={colPreviewKey}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" className="btn-primary">
                  {editingCollabId ? 'Save collaboration' : 'Add collaboration'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetCollabForm();
                    setShowCollabForm(false);
                  }}
                  className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {collabs.length === 0 ? (
            <div className="club-card p-4">
              <p className="text-[16px] text-[var(--muted)]">
                No collaborations added yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collabs.map((c, idx) => (
                <div key={c.id} className="club-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.dateLabel && c.dateLabel.trim() && (
                          <span className="px-2 py-0.5 rounded-full border border-[var(--divider)] bg-[var(--bg)] text-[11px] font-medium text-[var(--accent)]">
                            {c.dateLabel}
                          </span>
                        )}
                        <span className="text-[12px] text-[var(--muted)]">
                          {c.active ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      <div className="font-display text-[22px] text-[var(--text)] leading-tight">
                        {c.title}
                      </div>
                      <div className="text-[13px] text-[var(--muted)]">
                        {c.partnerName}
                      </div>
                    </div>

                    {c.logoUrl ? (
                      <img
                        src={c.logoUrl}
                        alt={`${c.partnerName} logo`}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 object-cover rounded-[8px] border border-[var(--divider)] shrink-0"
                      />
                    ) : (
                      <span className="text-[12px] text-[var(--muted)] shrink-0">
                        #{c.order}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => openEditCollab(c)}
                      className="btn-secondary-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleCollabActive(c.id, !c.active);
                        showFeedback(
                          'success',
                          !c.active ? 'Collaboration shown on Home.' : 'Collaboration hidden.'
                        );
                      }}
                      className="btn-secondary-sm"
                    >
                      {c.active ? 'Hide' : 'Show'}
                    </button>
                    {collabs.length > 1 && (
                      <>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => reorderCollab(c.id, 'up')}
                          aria-label="Move collaboration up"
                          className="btn-secondary-sm disabled:opacity-40"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === collabs.length - 1}
                          onClick={() => reorderCollab(c.id, 'down')}
                          aria-label="Move collaboration down"
                          className="btn-secondary-sm disabled:opacity-40"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCollab(c.id);
                        showFeedback('success', 'Collaboration deleted.');
                      }}
                      className="btn-secondary-sm text-[var(--accent)]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: UPDATES, VOICES, MEMORIES & PARTNERS
         ========================================================= */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          <form onSubmit={handleUpdateSubmit} className="club-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[24px] text-[var(--text)] leading-none">
                {editingUpdateId ? 'Edit Update' : 'Post Club Update'}
              </h2>
              <span className="label-sm tabular-nums">{updateText.length}/200</span>
            </div>

            {updateError && (
              <div className="p-3 rounded-[10px] border border-[var(--divider)] text-small font-semibold text-[var(--accent)]">
                {updateError}
              </div>
            )}

            <div>
              <label htmlFor="upd-text" className="block label-sm mb-1.5">
                Announcement text (shows at top of Home)
              </label>
              <textarea
                id="upd-text"
                rows={3}
                maxLength={200}
                required
                placeholder="Sunday run starts 15 mins early at 5:30 AM this week! Meet at TRS Gate."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value.slice(0, 200))}
                className="w-full club-input p-3"
              />
            </div>

            <div className="flex items-center justify-between py-2.5 border-y border-[var(--divider)]">
              <label htmlFor="upd-pin" className="text-[16px] text-[var(--text)] cursor-pointer">
                Pin to top of Home
              </label>
              <button
                id="upd-pin"
                type="button"
                role="switch"
                aria-checked={updatePinned}
                onClick={() => setUpdatePinned((v) => !v)}
                className={`w-12 h-7 rounded-full border border-[var(--divider)] p-0.5 cursor-pointer shrink-0 transition-colors ${
                  updatePinned ? 'bg-[var(--accent)]' : 'bg-[var(--bg)]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full transition-transform ${
                    updatePinned
                      ? 'translate-x-5 bg-[var(--on-accent)]'
                      : 'translate-x-0 bg-[var(--muted)]'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="btn-primary">
                {editingUpdateId ? 'Save update' : 'Post update'}
              </button>
              {editingUpdateId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUpdateId(null);
                    setUpdateText('');
                    setUpdatePinned(true);
                  }}
                  className="text-small font-semibold text-[var(--muted)] underline cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="font-display text-[22px] text-[var(--text)] leading-none">
              Posted Updates ({announcements.length})
            </h3>
            {announcements.length === 0 ? (
              <div className="club-card p-4">
                <p className="text-[16px] text-[var(--muted)]">No updates posted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="club-card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="label-sm text-[var(--accent)]">
                        {ann.pinned ? 'Pinned' : 'Update'}
                      </span>
                      <span className="label-sm tabular-nums">
                        Posted {formatPostedDate(ann.createdAt)}
                      </span>
                    </div>
                    <p className="text-[16px] text-[var(--text)] break-words">
                      {ann.text}
                    </p>
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePinAnnouncement(ann)}
                        className="btn-secondary-sm"
                      >
                        {ann.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditAnnouncement(ann)}
                        className="btn-secondary-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="btn-secondary-sm text-[var(--accent)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voices, Memories & Partners retained for existing admin management */}
          <div className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h3 className="font-display text-[22px] text-[var(--text)] leading-none">
              Voices ({voices.length}) · Memories ({memories.length}) · Partners ({partners.length})
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!voiceQuoteInput.trim() || !voiceRunnerInput.trim()) return;
                try {
                  await saveVoiceQuote({
                    quote: voiceQuoteInput.trim(),
                    runnerName: voiceRunnerInput.trim(),
                    tag: voiceTagInput.trim(),
                  });
                  setVoiceQuoteInput('');
                  setVoiceRunnerInput('');
                  showFeedback('success', 'Runner quote added.');
                } catch {
                  showFeedback('error', 'Could not save runner quote.');
                }
              }}
              className="club-card p-4 space-y-3"
            >
              <input
                type="text"
                required
                maxLength={240}
                placeholder="Runner quote (max 240 chars)"
                value={voiceQuoteInput}
                onChange={(e) => setVoiceQuoteInput(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Runner name"
                  value={voiceRunnerInput}
                  onChange={(e) => setVoiceRunnerInput(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Tag (e.g. 5K Runner)"
                  value={voiceTagInput}
                  onChange={(e) => setVoiceTagInput(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>
              <button type="submit" className="btn-secondary-sm">
                Add voice quote
              </button>
            </form>
            {voices.length > 0 && (
              <div className="club-card divide-y divide-[var(--divider)] px-4">
                {voices.map((vc) => (
                  <div
                    key={vc.id}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text)] truncate">
                        {vc.runnerName}
                      </div>
                      <div className="text-small text-[var(--muted)] truncate">
                        {vc.quote}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteVoiceQuote(vc.id)}
                      className="text-small font-semibold text-[var(--accent)] underline cursor-pointer shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!memTitleInput.trim() || !memLinkInput.trim()) return;
                try {
                  await saveMemoryAlbum({
                    title: memTitleInput.trim(),
                    date: memDateInput,
                    coverPhoto: memPhotoInput.trim() || '/club-photo.jpg',
                    link: memLinkInput.trim(),
                  });
                  setMemTitleInput('');
                  setMemLinkInput('');
                  showFeedback('success', 'Photo album added.');
                } catch {
                  showFeedback('error', 'Could not save photo album.');
                }
              }}
              className="club-card p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Album title"
                  value={memTitleInput}
                  onChange={(e) => setMemTitleInput(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
                <input
                  type="date"
                  required
                  value={memDateInput}
                  onChange={(e) => setMemDateInput(e.target.value)}
                  className="w-full h-[46px] club-input px-3"
                />
              </div>
              <select
                value={memPhotoInput}
                onChange={(e) => setMemPhotoInput(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              >
                <option value="/club-photo.jpg">Cover: Group photo (/club-photo.jpg)</option>
                <option value="/club-photo-2.jpg">Cover: Crowd photo (/club-photo-2.jpg)</option>
                <option value="/club-photo-3.jpg">Cover: Banner car (/club-photo-3.jpg)</option>
              </select>
              <input
                type="url"
                required
                maxLength={500}
                placeholder="Album link (Google Drive / Instagram URL)"
                value={memLinkInput}
                onChange={(e) => setMemLinkInput(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <button type="submit" className="btn-secondary-sm">
                Add memory album
              </button>
            </form>
            {memories.length > 0 && (
              <div className="club-card divide-y divide-[var(--divider)] px-4">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--text)] truncate">
                        {mem.title}
                      </div>
                      <div className="text-small text-[var(--muted)] tabular-nums">
                        {mem.date}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMemoryAlbum(mem.id)}
                      className="text-small font-semibold text-[var(--accent)] underline cursor-pointer shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!partnerNameInput.trim()) return;
                try {
                  await savePartnerEntry({
                    name: partnerNameInput.trim(),
                    websiteUrl: partnerWebInput.trim(),
                  });
                  setPartnerNameInput('');
                  setPartnerWebInput('');
                  showFeedback('success', 'Partner added.');
                } catch {
                  showFeedback('error', 'Could not save partner.');
                }
              }}
              className="club-card p-4 space-y-3"
            >
              <input
                type="text"
                required
                maxLength={80}
                placeholder="Partner name"
                value={partnerNameInput}
                onChange={(e) => setPartnerNameInput(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <button type="submit" className="btn-secondary-sm">
                Add partner
              </button>
            </form>
            {partners.length > 0 && (
              <div className="club-card divide-y divide-[var(--divider)] px-4">
                {partners.map((prt) => (
                  <div
                    key={prt.id}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <span className="font-semibold text-[var(--text)] truncate">
                      {prt.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePartnerEntry(prt.id)}
                      className="text-small font-semibold text-[var(--accent)] underline cursor-pointer shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: APPROVALS
         ========================================================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
                Pending Runs ({pendingRuns.length})
              </h2>
              <span className="label-sm">Review</span>
            </div>

            {pendingRuns.length === 0 ? (
              <div className="club-card p-4">
                <p className="text-[16px] text-[var(--muted)]">No pending runs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRuns.map((r) => {
                  const avgPaceSec =
                    r.durationSeconds && r.km > 0 ? r.durationSeconds / r.km : null;
                  const flagCheck = isRunFlagged(r.km, r.durationSeconds);
                  const isFlagged = Boolean(r.flagged || flagCheck.flagged);
                  const flagLabel =
                    r.flagReason || flagCheck.reason || 'Faster than 3:00/km or > 25 km';

                  return (
                    <div key={r.id} className="club-card p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-[22px] text-[var(--text)]">
                            {getRunnerName(r.uid)}
                          </div>
                          <div className="text-small text-[var(--muted)] tabular-nums">
                            Date: {r.date} • {r.type}
                          </div>
                        </div>
                        <span className="font-display text-[22px] text-[var(--accent)] tabular-nums">
                          {r.km} KM
                        </span>
                      </div>

                      <div className="text-small text-[var(--muted)] tabular-nums">
                        Time:{' '}
                        {r.durationSeconds && r.durationSeconds > 0
                          ? formatDuration(r.durationSeconds)
                          : 'Manual entry'}{' '}
                        • Pace:{' '}
                        {avgPaceSec ? `${formatPaceMinPerKm(avgPaceSec)}` : 'N/A'}
                      </div>

                      {isFlagged && (
                        <div className="label-sm text-[var(--accent)]">
                          Flagged: {flagLabel}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApproveRun(r.id)}
                          className="btn-secondary-sm text-[var(--accent)]"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRun(r.id)}
                          className="btn-secondary-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              Add a Run for a Runner
            </h2>

            {users.length === 0 ? (
              <div className="club-card p-4">
                <p className="text-[16px] text-[var(--muted)]">
                  No runners yet. Be the first to join.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleAddManualApprovedRun}
                className="club-card p-4 space-y-3.5"
              >
                <div>
                  <label htmlFor="adm-manual-runner" className="block label-sm mb-1.5">
                    Runner
                  </label>
                  <select
                    id="adm-manual-runner"
                    value={selectedRunnerUid}
                    onChange={(e) => setSelectedRunnerUid(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  >
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="adm-manual-date" className="block label-sm mb-1.5">
                      Date
                    </label>
                    <input
                      id="adm-manual-date"
                      type="date"
                      required
                      value={manualRunDate}
                      onChange={(e) => setManualRunDate(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-manual-km" className="block label-sm mb-1.5">
                      Distance (km)
                    </label>
                    <input
                      id="adm-manual-km"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="500"
                      required
                      value={manualRunKm}
                      onChange={(e) => setManualRunKm(e.target.value)}
                      className="w-full h-[46px] club-input px-3"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="adm-manual-type" className="block label-sm mb-1.5">
                    Type
                  </label>
                  <select
                    id="adm-manual-type"
                    value={manualRunType}
                    onChange={(e) => setManualRunType(e.target.value as RunType)}
                    className="w-full h-[46px] club-input px-3"
                  >
                    <option value="Club run">Club run</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <button type="submit" className="w-full btn-primary">
                  Add approved run
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          TAB 5: RUNNERS
         ========================================================= */}
      {activeTab === 'runners' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
                All Runners ({users.length})
              </h2>
              <span className="label-sm">Directory</span>
            </div>

            <div>
              <input
                type="search"
                placeholder="Search runner by name..."
                value={runnerSearch}
                onChange={(e) => setRunnerSearch(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
            </div>

            {filteredRunners.length === 0 ? (
              <div className="club-card p-4">
                <p className="text-[16px] text-[var(--muted)]">
                  No runners found matching your search.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRunners.map((u) => {
                  const approvedKm = getApprovedKmForUser(u.uid);
                  return (
                    <div key={u.uid} className="club-card p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.displayName} photoURL={u.photoURL} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-[20px] text-[var(--text)] truncate">
                                {u.displayName}
                              </span>
                              {!u.showPublicly && (
                                <span className="label-sm">Hidden</span>
                              )}
                            </div>
                            <div className="text-small text-[var(--muted)] truncate">
                              {u.bio || 'No bio'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-display text-[22px] text-[var(--accent)] tabular-nums">
                            {approvedKm} KM
                          </span>
                          <span className="block label-sm">approved</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          type="button"
                          onClick={() => handleToggleLeaderboardVisibility(u)}
                          className="btn-secondary-sm"
                        >
                          {u.showPublicly
                            ? 'Hide from leaderboard'
                            : 'Show on leaderboard'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearRunnerBio(u)}
                          className="btn-secondary-sm"
                        >
                          Clear bio
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRunnerPhotoBanner(u)}
                          className="btn-secondary-sm text-[var(--accent)]"
                        >
                          Remove photo or banner
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3 pt-4 border-t border-[var(--divider)]">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              Profile Reports ({reports.length})
            </h2>

            {reports.length === 0 ? (
              <div className="club-card p-4">
                <p className="text-[16px] text-[var(--muted)]">
                  No profile reports to review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="club-card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-[20px] text-[var(--text)]">
                        {rep.targetName}
                      </span>
                      <span className="label-sm text-[var(--accent)]">
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-[16px] text-[var(--text)]">Reason: {rep.reason}</p>
                    <div className="label-sm">
                      Reported {formatPostedDate(rep.createdAt)}
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                      {rep.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => handleResolveReport(rep.id)}
                          className="btn-secondary-sm"
                        >
                          Mark resolved
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep.id)}
                        className="btn-secondary-sm text-[var(--accent)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =========================================================
          TAB 6: SETTINGS & REWARDS (Links, Team rows, Phone numbers)
         ========================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              Club Links, Team & Contact
            </h2>

            <form onSubmit={handleSaveSettings} className="club-card p-4 space-y-5">
              {/* Links */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="set-reg-url" className="block label-sm mb-1.5">
                    Registration link
                  </label>
                  <input
                    id="set-reg-url"
                    type="url"
                    placeholder="https://forms.gle/..."
                    value={regUrlInput}
                    onChange={(e) => setRegUrlInput(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div>
                  <label htmlFor="set-wa-url" className="block label-sm mb-1.5">
                    WhatsApp community link
                  </label>
                  <input
                    id="set-wa-url"
                    type="url"
                    placeholder="https://chat.whatsapp.com/JvATq4OmMoD41LqSPfKUwL"
                    value={waUrlInput}
                    onChange={(e) => setWaUrlInput(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>

                <div>
                  <label htmlFor="set-ig-url" className="block label-sm mb-1.5">
                    Instagram link
                  </label>
                  <input
                    id="set-ig-url"
                    type="url"
                    placeholder="https://www.instagram.com/rewafrstrunclub/"
                    value={igUrlInput}
                    onChange={(e) => setIgUrlInput(e.target.value)}
                    className="w-full h-[46px] club-input px-3"
                  />
                </div>
              </div>

              {/* Team Rows */}
              <div className="pt-3 border-t border-[var(--divider)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="label-sm">Team rows</span>
                  <button
                    type="button"
                    onClick={handleAddTeamRow}
                    className="text-[12px] font-semibold text-[var(--accent)] underline cursor-pointer"
                  >
                    + Add member
                  </button>
                </div>

                <div className="space-y-3">
                  {teamRows.map((member, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[10px] border border-[var(--divider)] bg-[var(--bg)] space-y-2.5"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          maxLength={80}
                          placeholder="Name (e.g. Akhil Sharma)"
                          value={member.name}
                          onChange={(e) =>
                            handleTeamFieldChange(idx, 'name', e.target.value)
                          }
                          className="w-full h-[42px] club-input px-2.5"
                        />
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="Role (e.g. Founder)"
                          value={member.role}
                          onChange={(e) =>
                            handleTeamFieldChange(idx, 'role', e.target.value)
                          }
                          className="w-full h-[42px] club-input px-2.5"
                        />
                      </div>

                      <input
                        type="url"
                        maxLength={500}
                        placeholder="Instagram URL"
                        value={member.instagramUrl}
                        onChange={(e) =>
                          handleTeamFieldChange(idx, 'instagramUrl', e.target.value)
                        }
                        className="w-full h-[42px] club-input px-2.5"
                      />

                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="url"
                          maxLength={1000}
                          placeholder="Photo URL (optional, initials if empty)"
                          value={member.photoURL || ''}
                          onChange={(e) =>
                            handleTeamFieldChange(idx, 'photoURL', e.target.value)
                          }
                          className="flex-1 h-[38px] club-input px-2.5 text-[13px]"
                        />
                        {teamRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTeamRow(idx)}
                            className="text-[12px] font-semibold text-[var(--accent)] underline cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Phone Numbers */}
              <div className="pt-3 border-t border-[var(--divider)] space-y-3">
                <span className="block label-sm">Contact phone numbers</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="90981 76793"
                    value={phone1Input}
                    onChange={(e) => setPhone1Input(e.target.value)}
                    className="w-full h-[42px] club-input px-2.5"
                  />
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="78287 79901"
                    value={phone2Input}
                    onChange={(e) => setPhone2Input(e.target.value)}
                    className="w-full h-[42px] club-input px-2.5"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn-primary">
                Save settings
              </button>
            </form>
          </section>

          <section className="space-y-4 pt-4 border-t border-[var(--divider)]">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
                Leaderboard Rewards
              </h2>
              <span className="label-sm">Month: {currentMonthPrefix}</span>
            </div>

            <div className="club-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-sm text-[var(--accent)]">Position #1</span>
                <label className="flex items-center gap-2 text-small font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rank1Claimed}
                    onChange={(e) => setRank1Claimed(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span>Claimed</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={140}
                placeholder="Reward for #1 (e.g. Club Singlet + Gold Medal)"
                value={rank1Text}
                onChange={(e) => setRank1Text(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <button
                type="button"
                onClick={() =>
                  handleSavePositionReward(
                    1,
                    rank1Text,
                    rank1Claimed,
                    monthRewardsMap.r1?.id
                  )
                }
                className="btn-secondary-sm"
              >
                Save #1 reward
              </button>
            </div>

            <div className="club-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-sm">Position #2</span>
                <label className="flex items-center gap-2 text-small font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rank2Claimed}
                    onChange={(e) => setRank2Claimed(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span>Claimed</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={140}
                placeholder="Reward for #2 (e.g. Running Cap + Hydration Pack)"
                value={rank2Text}
                onChange={(e) => setRank2Text(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <button
                type="button"
                onClick={() =>
                  handleSavePositionReward(
                    2,
                    rank2Text,
                    rank2Claimed,
                    monthRewardsMap.r2?.id
                  )
                }
                className="btn-secondary-sm"
              >
                Save #2 reward
              </button>
            </div>

            <div className="club-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-sm">Position #3</span>
                <label className="flex items-center gap-2 text-small font-semibold text-[var(--text)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rank3Claimed}
                    onChange={(e) => setRank3Claimed(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span>Claimed</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={140}
                placeholder="Reward for #3 (e.g. FRST Run Club Coffee Voucher)"
                value={rank3Text}
                onChange={(e) => setRank3Text(e.target.value)}
                className="w-full h-[46px] club-input px-3"
              />
              <button
                type="button"
                onClick={() =>
                  handleSavePositionReward(
                    3,
                    rank3Text,
                    rank3Claimed,
                    monthRewardsMap.r3?.id
                  )
                }
                className="btn-secondary-sm"
              >
                Save #3 reward
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
