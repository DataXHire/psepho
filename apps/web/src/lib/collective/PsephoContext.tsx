'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Poll, UserProfile, GeoRegion, AgeCohort } from './types';
import { initialPolls, samplePersonas } from './seedData';
import { castVoteInPoll } from './analytics';

interface PsephoContextType {
  polls: Poll[];
  votes: Record<string, string>; // pollId -> optionId
  activeTab: 'Trending' | 'For You' | 'Topics';
  setActiveTab: (tab: 'Trending' | 'For You' | 'Topics') => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
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
  createPoll: (data: {
    question: string;
    category: Poll['category'];
    options: { label: string; subtitle?: string; icon?: string }[];
  }) => Poll;
}

const PsephoContext = createContext<PsephoContextType | undefined>(undefined);

const STORAGE_KEY_POLLS = 'psepho_polls_v2';
const STORAGE_KEY_VOTES = 'psepho_votes_v2';
const STORAGE_KEY_PROFILE = 'psepho_profile_v2';

export function PsephoProvider({ children }: { children: React.ReactNode }) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'Trending' | 'For You' | 'Topics'>('Trending');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isAskModalOpen, setIsAskModalOpen] = useState<boolean>(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState<boolean>(false);
  const [inspectPollId, setInspectPollId] = useState<string | null>(null);
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
    } catch (e) {
      console.warn('Failed to save psepho state to localStorage', e);
    }
  }, [polls, votes, currentProfile, isHydrated]);

  const castVote = (pollId: string, optionId: string) => {
    const userRegion = currentProfile?.region || 'South';
    const userCohort = currentProfile?.ageCohort || '25-34';

    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          return castVoteInPoll(poll, optionId, userRegion, userCohort);
        }
        return poll;
      })
    );

    setVotes((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  const createPoll = (data: {
    question: string;
    category: Poll['category'];
    options: { label: string; subtitle?: string; icon?: string }[];
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
      closesIn: '7 days',
      totalVotes: 1,
      createdAt: new Date().toISOString(),
      options: data.options.map((opt, idx) => ({
        id: `opt-${idx}-${Date.now()}`,
        label: opt.label,
        subtitle: opt.subtitle || 'Community proposal',
        icon: opt.icon || (idx === 0 ? 'thumb_up' : 'thumb_down'),
        votes: idx === 0 ? 1 : 0,
        percentage: idx === 0 ? 100 : 0,
      })) as any,
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
        createPoll,
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
