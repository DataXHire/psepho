'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Poll, UserProfile } from './types';
import { initialPolls } from './seedData';
import { castVoteInPoll } from './analytics';
import { appConfig, type BackgroundStyle, type CategoryFilter } from '@/lib/config/appConfig';
import { DEFAULT_DATA_MODE, IS_DEV_BUILD, type DataMode } from '@/lib/config/environment';

interface PsephoContextType {
  polls: Poll[];
  votes: Record<string, string>; // pollId -> optionId
  activeTab: 'Trending' | 'For You' | 'Topics';
  setActiveTab: (tab: 'Trending' | 'For You' | 'Topics') => void;
  activeCategory: CategoryFilter;
  setActiveCategory: (category: CategoryFilter) => void;
  currentProfile: UserProfile | null;
  setCurrentProfile: (profile: UserProfile | null) => void;
  isAskModalOpen: boolean;
  openAskModal: () => void;
  closeAskModal: () => void;
  isPersonaModalOpen: boolean;
  openPersonaModal: () => void;
  closePersonaModal: () => void;
  inspectPollId: string | null;
  setInspectPollId: (id: string | null) => void;
  castVote: (pollId: string, optionId: string) => void;
  /** Ends a poll for good. Only its owner may do this, and only while open. */
  closePoll: (pollId: string) => void;
  createPoll: (data: {
    question: string;
    category: Poll['category'];
    options: { label: string; subtitle?: string; icon?: string }[];
    /** Days until it closes on its own; `null` keeps it open indefinitely. */
    durationDays: number | null;
  }) => Poll;
  /** Free-text filter applied across the whole app. */
  search: string;
  setSearch: (value: string) => void;
  /** Whether the proposals summary is shown on the home page. */
  showProposalsPanel: boolean;
  setShowProposalsPanel: (value: boolean) => void;
  background: BackgroundStyle;
  setBackground: (value: BackgroundStyle) => void;
  /** Always 'live' outside a development build. */
  dataMode: DataMode;
  setDataMode: (value: DataMode) => void;
}

const PsephoContext = createContext<PsephoContextType | undefined>(undefined);

// Bumped because polls gained a lifecycle: stored v2 polls have no `status`.
const STORAGE_KEY_POLLS = 'psepho_polls_v3';
const STORAGE_KEY_VOTES = 'psepho_votes_v3';
const STORAGE_KEY_PROFILE = 'psepho_profile_v3';
const STORAGE_KEY_PREFS = 'psepho_prefs_v1';

export function PsephoProvider({ children }: { children: React.ReactNode }) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'Trending' | 'For You' | 'Topics'>('Trending');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isAskModalOpen, setIsAskModalOpen] = useState<boolean>(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState<boolean>(false);
  const [inspectPollId, setInspectPollId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showProposalsPanel, setShowProposalsPanel] = useState(true);
  const [background, setBackground] = useState<BackgroundStyle>(appConfig.background);
  const [dataMode, setDataModeState] = useState<DataMode>(DEFAULT_DATA_MODE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const storedPolls = localStorage.getItem(STORAGE_KEY_POLLS);
      const storedVotes = localStorage.getItem(STORAGE_KEY_VOTES);
      const storedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);

      if (storedPolls) {
        setPolls(JSON.parse(storedPolls));
      }
      if (storedVotes) {
        setVotes(JSON.parse(storedVotes));
      }
      if (storedProfile) {
        setCurrentProfile(JSON.parse(storedProfile));
      }

      const storedPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
      if (storedPrefs) {
        const prefs = JSON.parse(storedPrefs) as {
          background?: BackgroundStyle;
          showProposalsPanel?: boolean;
          dataMode?: DataMode;
        };
        if (prefs.background) setBackground(prefs.background);
        if (IS_DEV_BUILD && prefs.dataMode) setDataModeState(prefs.dataMode);
        if (typeof prefs.showProposalsPanel === 'boolean') {
          setShowProposalsPanel(prefs.showProposalsPanel);
        }
      }
    } catch (e) {
      console.warn('Failed to load psepho state from localStorage', e);
    }
    setIsHydrated(true);
  }, []);

  // Save changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
      localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(votes));
      if (currentProfile) {
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(currentProfile));
      } else {
        localStorage.removeItem(STORAGE_KEY_PROFILE);
      }
      localStorage.setItem(
        STORAGE_KEY_PREFS,
        JSON.stringify({ background, showProposalsPanel, dataMode })
      );
    } catch (e) {
      console.warn('Failed to save psepho state to localStorage', e);
    }
  }, [polls, votes, currentProfile, background, showProposalsPanel, dataMode, isHydrated]);

  const castVote = (pollId: string, optionId: string) => {
    const target = polls.find((p) => p.id === pollId);
    // A closed poll's result is final; refuse rather than silently mutating it.
    if (!target || target.status === 'closed') return;

    const userRegion = currentProfile?.region || 'South';
    const userCohort = currentProfile?.ageCohort || '25-34';

    setPolls((prev) =>
      prev.map((poll) =>
        poll.id === pollId ? castVoteInPoll(poll, optionId, userRegion, userCohort) : poll
      )
    );

    setVotes((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  const closePoll = (pollId: string) => {
    setPolls((prev) =>
      prev.map((poll) =>
        poll.id === pollId && poll.status === 'open'
          ? {
              ...poll,
              status: 'closed',
              closesIn: null,
              closedAt: new Date().toISOString(),
              badge: { label: 'Closed', type: 'civic' },
            }
          : poll
      )
    );
  };

  const createPoll = (data: {
    question: string;
    category: Poll['category'];
    options: { label: string; subtitle?: string; icon?: string }[];
    durationDays: number | null;
  }): Poll => {
    const slug = data.question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      slug: slug || `poll-${Date.now()}`,
      question: data.question,
      category: data.category,
      kind: 'user',
      badge: { label: 'New Debate', type: 'civic' },
      status: 'open',
      closesIn:
        data.durationDays === null
          ? null
          : `${data.durationDays} day${data.durationDays === 1 ? '' : 's'}`,
      totalVotes: 1,
      createdAt: new Date().toISOString(),
      options: data.options.map((opt, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        label: opt.label,
        subtitle: opt.subtitle || 'Community proposal',
        icon: opt.icon || (idx === 0 ? 'thumb_up' : 'thumb_down'),
        votes: idx === 0 ? 1 : 0,
        percentage: idx === 0 ? 100 : 0,
      })) as Poll['options'],
      regionalBreakdown: {
        South: { region: 'South', percentage: 100, votes: 1, density: 'medium' },
        West: { region: 'West', percentage: 0, votes: 0, density: 'low' },
        North: { region: 'North', percentage: 0, votes: 0, density: 'low' },
        East: { region: 'East', percentage: 0, votes: 0, density: 'low' },
        Central: { region: 'Central', percentage: 0, votes: 0, density: 'low' },
      },
      demographicBreakdown: [
        { cohort: '18-24', supportPct: 50, nationalPct: 50, divergence: 0 },
        { cohort: '25-34', supportPct: 50, nationalPct: 50, divergence: 0 },
        { cohort: '35-49', supportPct: 50, nationalPct: 50, divergence: 0 },
        { cohort: '50+', supportPct: 50, nationalPct: 50, divergence: 0 },
      ],
      discoveryNote: 'Just created! Share the link to gather district & demographic consensus.',
      userVotedOptionId: `opt-0-${Date.now()}`,
    };

    setPolls((prev) => [newPoll, ...prev]);
    setVotes((prev) => ({
      ...prev,
      [newPoll.id]: newPoll.options[0].id,
    }));

    return newPoll;
  };

  return (
    <PsephoContext.Provider
      value={{
        polls,
        votes,
        activeTab,
        setActiveTab,
        activeCategory,
        setActiveCategory,
        currentProfile,
        setCurrentProfile,
        isAskModalOpen,
        openAskModal: () => setIsAskModalOpen(true),
        closeAskModal: () => setIsAskModalOpen(false),
        isPersonaModalOpen,
        openPersonaModal: () => setIsPersonaModalOpen(true),
        closePersonaModal: () => setIsPersonaModalOpen(false),
        inspectPollId,
        setInspectPollId,
        castVote,
        closePoll,
        createPoll,
        search,
        setSearch,
        showProposalsPanel,
        setShowProposalsPanel,
        background,
        setBackground,
        dataMode,
        // Sample data is a development affordance; production is always live.
        setDataMode: (value: DataMode) => setDataModeState(IS_DEV_BUILD ? value : 'live'),
      }}
    >
      {children}
    </PsephoContext.Provider>
  );
}

export function usePsepho() {
  const context = useContext(PsephoContext);
  if (!context) {
    throw new Error('usePsepho must be used within a PsephoProvider');
  }
  return context;
}
