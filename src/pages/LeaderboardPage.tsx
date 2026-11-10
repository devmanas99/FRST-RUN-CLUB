import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import { RunnerComputedStats } from '../types';
import {
  CountUpKm,
  DoodleCrown,
  ScrollRevealSection,
} from '../components/Doodles';

export const LeaderboardPage: React.FC = () => {
  const {
    leaderboardAllTime,
    leaderboardThisMonth,
    currentMonthPrefix,
    rewards,
    isAdmin,
    saveReward,
    loading,
  } = useClub();
  const [mode, setMode] = useState<'month' | 'all'>('month');
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardNameDraft, setRewardNameDraft] = useState('');

  const activeBoard = mode === 'month' ? leaderboardThisMonth : leaderboardAllTime;
  const getKm = (r: RunnerComputedStats) => (mode === 'month' ? r.monthlyKm : r.totalKm);
  const getRank = (r: RunnerComputedStats) =>
    mode === 'month' ? r.monthlyRank : r.allTimeRank;

  const rankedRunners = activeBoard.filter((r) => getKm(r) > 0 && getRank(r) > 0);
  const topThreeRunners = rankedRunners.slice(0, 3);
  const listRunners = activeBoard.filter((r) => {
    const rnk = getRank(r);
    return rnk === 0 || rnk > 3;
  });

  const startEditReward = (id: string, currentName: string) => {
    setEditingRewardId(id);
    setRewardNameDraft(currentName);
  };

  const saveEditReward = async (
    id: string,
    month: string,
    rank: 1 | 2 | 3,
    claimed: boolean
  ) => {
    if (!rewardNameDraft.trim()) return;
    await saveReward({ id, month, rank, rewardName: rewardNameDraft, claimed });
    setEditingRewardId(null);
  };

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="h-40 club-card" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8 overflow-x-hidden">
      {/* Leaderboard Section (1 subtle doodle per screen: DoodleCrown) */}
      <ScrollRevealSection ariaLabel="Leaderboard rankings" className="space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="label-sm block">FRST Run Club Rankings</span>
            <h1 className="font-display text-[34px] text-[var(--text)] leading-none">
              Leaderboard
            </h1>
            <p className="text-[16px] text-[var(--muted)] pt-1">
              Tap any runner to view their profile and recent runs.
            </p>
          </div>
          <DoodleCrown className="w-8 h-6 mt-1" />
        </div>

        {/* This month / All time switch */}
        <div
          role="tablist"
          aria-label="Leaderboard period"
          className="grid grid-cols-2 gap-2.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'month'}
            onClick={() => setMode('month')}
            className={mode === 'month' ? 'btn-primary' : 'btn-secondary'}
          >
            This Month
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'all'}
            onClick={() => setMode('all')}
            className={mode === 'all' ? 'btn-primary' : 'btn-secondary'}
          >
            All Time
          </button>
        </div>

        {activeBoard.length === 0 ? (
          <div className="club-card p-4">
            <p className="text-[16px] text-[var(--muted)]">
              No runners yet. Be the first to join.
            </p>
          </div>
        ) : (
          <div key={mode} className="space-y-4">
            {/* TOP 3 CLEAN LIST with large rank numbers and accent colour only for #1 */}
            {topThreeRunners.length > 0 && (
              <div className="club-card divide-y divide-[var(--divider)] px-4">
                {topThreeRunners.map((item, idx) => {
                  const rank = getRank(item);
                  const km = getKm(item);
                  const isFirst = rank === 1;
                  const rankStr = String(rank).padStart(2, '0');

                  return (
                    <Link
                      key={item.user.uid}
                      to={`/runner/${item.user.uid}`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="animate-row-slide py-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`font-display text-[32px] leading-none tabular-nums w-9 shrink-0 ${
                            isFirst ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                          }`}
                        >
                          {rankStr}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[16px] font-semibold text-[var(--text)] truncate">
                            {item.user.displayName}
                          </div>
                          <div className="text-small text-[var(--muted)]">
                            {mode === 'month'
                              ? `${item.monthlyRunsCount} runs this month`
                              : `${item.runsCount} total runs`}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`font-display text-[26px] tabular-nums shrink-0 ${
                          isFirst ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                        }`}
                      >
                        <CountUpKm value={km} /> KM
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Remaining Ranked & Unranked Rows (appear 40ms apart) */}
            {listRunners.length > 0 && (
              <div className="club-card divide-y divide-[var(--divider)] px-4">
                {listRunners.map((item, idx) => {
                  const km = getKm(item);
                  const rank = getRank(item);
                  const isUnranked = km <= 0 || rank === 0;
                  const delayIdx = topThreeRunners.length + idx;

                  return (
                    <Link
                      key={item.user.uid}
                      to={`/runner/${item.user.uid}`}
                      style={{ animationDelay: `${delayIdx * 40}ms` }}
                      className="animate-row-slide py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isUnranked ? (
                          <span className="label-sm shrink-0">Unranked</span>
                        ) : (
                          <span className="text-small font-bold text-[var(--accent)] tabular-nums w-7 shrink-0">
                            {String(rank).padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-[16px] font-medium text-[var(--text)] truncate">
                          {item.user.displayName}
                        </span>
                      </div>
                      <span className="font-display text-[20px] text-[var(--text)] tabular-nums shrink-0">
                        <CountUpKm value={km} /> KM
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollRevealSection>

      {/* Rewards Section below Leaderboard */}
      <ScrollRevealSection ariaLabel="Monthly rewards" className="space-y-4 pt-2 border-t border-[var(--divider)]">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-[26px] text-[var(--text)] leading-none">
              Monthly Rewards
            </h2>
            <span className="label-sm">{currentMonthPrefix}</span>
          </div>
          <p className="text-[16px] text-[var(--muted)]">
            Prizes for the top 3 runners of the month.
          </p>
        </div>

        {rewards.length === 0 ? (
          <div className="club-card p-4">
            <p className="text-[16px] text-[var(--muted)]">
              No monthly rewards added yet.
            </p>
          </div>
        ) : (
          <div className="club-card divide-y divide-[var(--divider)] px-4">
            {rewards.map((rewardDoc) => {
              const runnerStats = rankedRunners[rewardDoc.rank - 1];
              const isEditing = editingRewardId === rewardDoc.id;

              return (
                <div key={rewardDoc.id} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-display text-[20px] text-[var(--text)] truncate">
                      <span className="text-[var(--accent)] mr-2">
                        0{rewardDoc.rank}
                      </span>
                      {runnerStats ? runnerStats.user.displayName : 'TBD'}
                    </div>
                    <span className="label-sm">
                      {rewardDoc.claimed ? 'Claimed' : 'Unclaimed'}
                    </span>
                  </div>

                  <div>
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={rewardNameDraft}
                          onChange={(e) => setRewardNameDraft(e.target.value)}
                          maxLength={140}
                          className="w-full h-[42px] club-input px-3"
                        />
                        <div className="flex items-center gap-4 text-small font-semibold">
                          <button
                            type="button"
                            onClick={() =>
                              saveEditReward(
                                rewardDoc.id,
                                rewardDoc.month,
                                rewardDoc.rank,
                                rewardDoc.claimed
                              )
                            }
                            className="text-[var(--accent)] underline cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRewardId(null)}
                            className="text-[var(--muted)] underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[16px] text-[var(--muted)]">
                          {rewardDoc.rewardName}
                        </p>
                        {isAdmin && (
                          <div className="flex items-center gap-3 text-small font-semibold shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                saveReward({
                                  id: rewardDoc.id,
                                  month: rewardDoc.month,
                                  rank: rewardDoc.rank,
                                  rewardName: rewardDoc.rewardName,
                                  claimed: !rewardDoc.claimed,
                                })
                              }
                              className="text-[var(--accent)] underline cursor-pointer"
                            >
                              {rewardDoc.claimed ? 'Unclaim' : 'Claim'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                startEditReward(rewardDoc.id, rewardDoc.rewardName)
                              }
                              className="text-[var(--muted)] underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollRevealSection>
    </div>
  );
};
