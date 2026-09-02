import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { rnLightTheme } from '@psepho/tokens/react-native';
import { getSavedPolls, StoredPollMeta } from '../storage';

interface MineScreenProps {
  onOpenPoll: (slug: string) => void;
  onGoToCreate: () => void;
}

export function MineScreen({ onOpenPoll, onGoToCreate }: MineScreenProps) {
  const [polls, setPolls] = useState<StoredPollMeta[]>([]);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    const data = await getSavedPolls();
    setPolls(data);
  };

  const openPolls = polls.filter((p) => {
    if (p.closedAt) return false;
    if (p.closesAt && new Date(p.closesAt) <= new Date()) return false;
    return true;
  });

  const closedPolls = polls.filter((p) => {
    if (p.closedAt) return true;
    if (p.closesAt && new Date(p.closesAt) <= new Date()) return true;
    return false;
  });

  if (polls.length === 0) {
    // Exact empty state copy from §1.8:
    // "No polls yet. Create one and share the link. with the create action."
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No polls yet. Create one and share the link.
        </Text>
        <TouchableOpacity onPress={onGoToCreate} style={styles.createBtn}>
          <Text style={styles.createBtnText}>Create a poll</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPollRow = ({ item }: { item: StoredPollMeta }) => {
    const isClosed = item.closedAt || (item.closesAt && new Date(item.closesAt) <= new Date());
    let timeText = 'Open';
    if (isClosed) {
      timeText = 'Closed';
    } else if (item.closesAt) {
      const diffHrs = Math.max(1, Math.round((new Date(item.closesAt).getTime() - Date.now()) / (3600 * 1000)));
      timeText = `${diffHrs}h remaining`;
    }

    return (
      <TouchableOpacity
        onPress={() => onOpenPoll(item.slug)}
        style={styles.pollCard}
      >
        <View style={styles.pollHeader}>
          <Text style={styles.pollQuestion} numberOfLines={2}>
            {item.question}
          </Text>
          {item.isCreator && (
            <Text style={styles.creatorBadge}>Creator</Text>
          )}
        </View>

        <View style={styles.pollMeta}>
          <Text style={styles.metaText}>
            {item.totalVotes || 0} votes · {timeText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={polls}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <View>
            <Text style={styles.heading}>My Polls</Text>
            {openPolls.length > 0 && (
              <Text style={styles.sectionHeader}>Open ({openPolls.length})</Text>
            )}
          </View>
        )}
        renderItem={renderPollRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
  },
  listContent: {
    padding: 20,
  },
  heading: {
    fontSize: 27,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: rnLightTheme.colors.slate,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pollCard: {
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.row,
    padding: 14,
    marginBottom: 10,
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  pollQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
    lineHeight: 22,
  },
  creatorBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: rnLightTheme.colors.patina,
    backgroundColor: `${rnLightTheme.colors.patina}18`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  pollMeta: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: rnLightTheme.colors.slate,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: rnLightTheme.colors.slate,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  createBtn: {
    backgroundColor: rnLightTheme.colors.patina,
    borderRadius: rnLightTheme.radii.interactive,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
});
