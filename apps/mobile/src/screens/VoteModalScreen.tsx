import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { rnLightTheme } from '@psepho/tokens/react-native';
import { enqueueBallot, savePollMeta } from '../storage';
import { MobilePebble } from '../components/MobilePebble';

interface VoteModalScreenProps {
  slug: string;
  onClose: () => void;
}

export function VoteModalScreen({ slug, onClose }: VoteModalScreenProps) {
  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [receiptCode, setReceiptCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Multi-question swipe index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    loadPollData();
  }, [slug]);

  const loadPollData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/polls/${slug}`);
      if (!res.ok) throw new Error('Poll not found');
      const data = await res.json();
      setPoll(data.poll);
      setOptions(data.options);
      if (data.ballot) {
        setHasVoted(true);
        setSelectedChoices(data.ballot.choice);
        setReceiptCode(data.ballot.receiptCode);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load poll');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHaptic = () => {
    try {
      // "Mobile only: one light haptic tap at the moment the fill starts." (§1.4)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics unavailable fallback
    }
  };

  const handleSelectOption = (optId: string) => {
    if (hasVoted || isSubmitting) return;

    triggerHaptic();

    if (poll?.kind === 'single') {
      setSelectedChoices([optId]);
      castBallot([optId]);
    } else if (poll?.kind === 'multi') {
      setSelectedChoices((prev) => {
        if (prev.includes(optId)) {
          return prev.filter((id) => id !== optId);
        }
        if (poll.maxChoices && prev.length >= poll.maxChoices) {
          return prev;
        }
        return [...prev, optId];
      });
    } else if (poll?.kind === 'ranked') {
      setSelectedChoices((prev) => {
        if (prev.includes(optId)) {
          return prev.filter((id) => id !== optId);
        }
        return [...prev, optId];
      });
    }
  };

  const castBallot = async (choices: string[]) => {
    if (choices.length === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setOfflineNotice(null);

    const ballotToken = 'mobile-ballot-token-' + Date.now();

    try {
      const res = await fetch(`http://localhost:3000/api/polls/${slug}/ballot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ballot-token': ballotToken,
        },
        body: JSON.stringify({ choice: choices, ballotToken }),
      });

      if (!res.ok) {
        throw new Error("Your vote didn't reach the server. Retry.");
      }

      const data = await res.json();
      setHasVoted(true);
      setReceiptCode(data.receiptCode);

      await savePollMeta({
        slug,
        question: poll.question,
        isCreator: false,
        votedChoice: choices,
        receiptCode: data.receiptCode,
      });
    } catch (err: any) {
      // Offline fallback queue (§1.8)
      if (err.message.includes('Network') || err.message.includes('fetch')) {
        await enqueueBallot({
          slug,
          choice: choices,
          ballotToken,
          queuedAt: new Date().toISOString(),
        });
        // Exact copy from §1.8: "Saved. Will send when you're back online."
        setOfflineNotice("Saved. Will send when you're back online.");
        setHasVoted(true);
      } else {
        // Exact error copy from §1.8: "Your vote didn't reach the server. Retry."
        setErrorMessage("Your vote didn't reach the server. Retry.");
        setSelectedChoices([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={rnLightTheme.colors.patina} size="large" />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No poll at this link. It may have been deleted.</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.headerAction}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>psepho</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* The Question is the largest thing on screen */}
        <Text style={styles.questionText}>{poll.question}</Text>

        {/* Offline notification */}
        {offlineNotice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{offlineNotice}</Text>
          </View>
        )}

        {/* Error retry box */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => castBallot(selectedChoices)}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Option rows (minimum 56px height, entire row is hit target) */}
        <View style={styles.optionsList}>
          {options.map((opt, idx) => {
            const isSelected = selectedChoices.includes(opt.id);
            const rankedIdx =
              poll.kind === 'ranked' && isSelected
                ? selectedChoices.indexOf(opt.id) + 1
                : null;

            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => handleSelectOption(opt.id)}
                disabled={hasVoted}
                style={[
                  styles.optionRow,
                  isSelected && styles.optionRowSelected,
                ]}
              >
                <View style={styles.optionLeft}>
                  {rankedIdx !== null ? (
                    <Text style={styles.rankedBadge}>{rankedIdx}</Text>
                  ) : (
                    <Text style={styles.letterMarker}>
                      {String.fromCharCode(65 + idx)}
                    </Text>
                  )}
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </View>

                {hasVoted && isSelected && (
                  <View style={styles.yourVoteBadge}>
                    <Text style={styles.yourVoteText}>Your vote</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Multi / Ranked submit button */}
        {!hasVoted && (poll.kind === 'multi' || poll.kind === 'ranked') && (
          <TouchableOpacity
            onPress={() => castBallot(selectedChoices)}
            disabled={selectedChoices.length === 0 || isSubmitting}
            style={styles.submitBtn}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting
                ? 'Submitting...'
                : poll.kind === 'ranked'
                ? 'Submit ranking'
                : 'Submit ballot'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Ballot Receipt confirmation */}
        {receiptCode && (
          <View style={styles.receiptBox}>
            <Text style={styles.receiptLabel}>Receipt Code</Text>
            <Text style={styles.receiptCode}>{receiptCode}</Text>
          </View>
        )}

        {/* Integrity line */}
        <View style={styles.integrityFooter}>
          <Text style={styles.integrityText}>
            {poll.integrity === 'device'
              ? 'One vote per browser'
              : 'Open poll — anyone can vote, more than once'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: rnLightTheme.colors.rule,
  },
  headerAction: {
    fontSize: 14,
    color: rnLightTheme.colors.patina,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  questionText: {
    fontSize: 32,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
    lineHeight: 38,
    marginBottom: 24,
  },
  noticeBox: {
    padding: 12,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.patina,
    borderRadius: rnLightTheme.radii.row,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 13,
    color: rnLightTheme.colors.patina,
    fontWeight: '500',
  },
  errorBox: {
    padding: 12,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.alarm,
    borderRadius: rnLightTheme.radii.row,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: rnLightTheme.colors.alarm,
  },
  retryBtn: {
    backgroundColor: rnLightTheme.colors.alarm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 3,
  },
  retryBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  optionsList: {
    gap: 10,
    marginBottom: 24,
  },
  optionRow: {
    minHeight: 56,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.row,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRowSelected: {
    borderColor: rnLightTheme.colors.ink,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  letterMarker: {
    fontSize: 13,
    fontWeight: '600',
    color: rnLightTheme.colors.slate,
    width: 20,
  },
  rankedBadge: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: rnLightTheme.colors.ink,
    color: rnLightTheme.colors.surface,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  optionLabel: {
    fontSize: 16,
    color: rnLightTheme.colors.ink,
    flex: 1,
  },
  yourVoteBadge: {
    backgroundColor: rnLightTheme.colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  yourVoteText: {
    color: rnLightTheme.colors.surface,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  submitBtn: {
    backgroundColor: rnLightTheme.colors.patina,
    borderRadius: rnLightTheme.radii.interactive,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
  receiptBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.row,
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
    color: rnLightTheme.colors.slate,
    marginBottom: 4,
  },
  receiptCode: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: rnLightTheme.colors.ink,
    letterSpacing: 1,
  },
  integrityFooter: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    paddingTop: 16,
  },
  integrityText: {
    fontSize: 12,
    color: rnLightTheme.colors.slate,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: rnLightTheme.colors.ink,
    borderRadius: 4,
  },
  closeBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 13,
  },
});
