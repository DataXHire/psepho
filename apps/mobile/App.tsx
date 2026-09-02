import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { rnLightTheme } from '@psepho/tokens/react-native';
import { CreateScreen } from './src/screens/CreateScreen';
import { MineScreen } from './src/screens/MineScreen';
import { ScanScreen } from './src/screens/ScanScreen';
import { VoteModalScreen } from './src/screens/VoteModalScreen';
import { getQueuedBallots, clearQueuedBallots } from './src/storage';

type Tab = 'create' | 'mine' | 'scan';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [activePollSlug, setActivePollSlug] = useState<string | null>(null);

  // 1. Handle Deep Linking (§1.6)
  // psepho://p/[slug] and universal links psepho.app/p/[slug]
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path) {
        const match = parsed.path.match(/p\/([A-Za-z0-9]+)/);
        if (match && match[1]) {
          setActivePollSlug(match[1]);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, []);

  // 2. Synchronize queued offline ballots when active (§1.8)
  useEffect(() => {
    async function syncOfflineQueue() {
      const queued = await getQueuedBallots();
      if (queued.length === 0) return;

      for (const item of queued) {
        try {
          await fetch(`http://localhost:3000/api/polls/${item.slug}/ballot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ballot-token': item.ballotToken,
            },
            body: JSON.stringify({ choice: item.choice, ballotToken: item.ballotToken }),
          });
        } catch {
          // Keep in queue if still offline
          return;
        }
      }
      await clearQueuedBallots();
    }

    syncOfflineQueue();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Main Tab Views */}
      <View style={styles.content}>
        {activeTab === 'create' && (
          <CreateScreen onPollCreated={(slug) => setActivePollSlug(slug)} />
        )}
        {activeTab === 'mine' && (
          <MineScreen
            onOpenPoll={(slug) => setActivePollSlug(slug)}
            onGoToCreate={() => setActiveTab('create')}
          />
        )}
        {activeTab === 'scan' && (
          <ScanScreen onScanResult={(slug) => setActivePollSlug(slug)} />
        )}
      </View>

      {/* Vote Screen / Deep Link Modal */}
      {activePollSlug && (
        <View style={StyleSheet.absoluteFill}>
          <VoteModalScreen
            slug={activePollSlug}
            onClose={() => setActivePollSlug(null)}
          />
        </View>
      )}

      {/* Three Tabs: Create, Mine, Scan (§1.6) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('create')}
          style={styles.tabItem}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'create' && styles.tabLabelActive,
            ]}
          >
            Create
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('mine')}
          style={styles.tabItem}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'mine' && styles.tabLabelActive,
            ]}
          >
            Mine
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('scan')}
          style={styles.tabItem}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'scan' && styles.tabLabelActive,
            ]}
          >
            Scan
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    backgroundColor: rnLightTheme.colors.surface,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: rnLightTheme.colors.slate,
  },
  tabLabelActive: {
    color: rnLightTheme.colors.patina,
    fontWeight: '700',
  },
});
