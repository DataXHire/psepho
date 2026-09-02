import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { rnLightTheme } from '@psepho/tokens/react-native';
import { savePollMeta } from '../storage';

interface CreateScreenProps {
  onPollCreated: (slug: string) => void;
}

export function CreateScreen({ onPollCreated }: CreateScreenProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings sentence
  const [closesInHours, setClosesInHours] = useState(24);
  const [visibility, setVisibility] = useState('after_close');
  const [integrity, setIntegrity] = useState('device');

  const addOption = () => {
    if (options.length < 20) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, text: string) => {
    const next = [...options];
    next[idx] = text;
    setOptions(next);
  };

  const handlePublish = async () => {
    const trimmedQ = question.trim();
    if (!trimmedQ) {
      Alert.alert('Required', 'Please enter a question');
      return;
    }
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      Alert.alert('Required', 'At least 2 options are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // In production mobile points to NEXT_PUBLIC_APP_URL or localhost
      const apiUrl = 'http://localhost:3000/api/polls';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmedQ,
          options: cleanOpts,
          integrity,
          closesInHours,
          visibility,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to publish poll');
      }

      const data = await res.json();
      await savePollMeta({
        slug: data.slug,
        question: trimmedQ,
        creatorToken: data.creatorToken,
        isCreator: true,
        closesAt: new Date(Date.now() + closesInHours * 3600 * 1000).toISOString(),
        totalVotes: 0,
      });

      Alert.alert('Published', `Poll published at /p/${data.slug}`);
      onPollCreated(data.slug);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not publish poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Question field at top (27px) */}
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question..."
          placeholderTextColor={rnLightTheme.colors.rule}
          multiline
          style={styles.questionInput}
        />

        {/* Options in a list */}
        <View style={styles.optionsList}>
          {options.map((opt, idx) => (
            <View key={idx} style={styles.optionRow}>
              <Text style={styles.optionLetter}>
                {String.fromCharCode(65 + idx)}
              </Text>
              <TextInput
                value={opt}
                onChangeText={(t) => updateOption(idx, t)}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                placeholderTextColor={rnLightTheme.colors.slate}
                style={styles.optionInput}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(idx)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {options.length < 20 && (
            <TouchableOpacity onPress={addOption} style={styles.addOptionBtn}>
              <Text style={styles.addOptionText}>+ Add option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings sentence in --slate */}
        <View style={styles.settingsBox}>
          <Text style={styles.settingsSentence}>
            One vote per device · closes in 24 hours · results after close
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Publish poll button above the keyboard */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={isSubmitting}
          style={styles.publishBtn}
        >
          <Text style={styles.publishBtnText}>
            {isSubmitting ? 'Publishing...' : 'Publish poll'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  questionInput: {
    fontSize: 27,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
    lineHeight: 32,
    marginBottom: 24,
    minHeight: 64,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.row,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '600',
    color: rnLightTheme.colors.slate,
    width: 24,
  },
  optionInput: {
    flex: 1,
    fontSize: 15,
    color: rnLightTheme.colors.ink,
    paddingVertical: 10,
  },
  removeBtn: {
    padding: 6,
  },
  removeBtnText: {
    fontSize: 18,
    color: rnLightTheme.colors.slate,
  },
  addOptionBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: rnLightTheme.colors.patina,
  },
  settingsBox: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: rnLightTheme.colors.rule,
  },
  settingsSentence: {
    fontSize: 13,
    color: rnLightTheme.colors.slate,
    lineHeight: 20,
  },
  stickyFooter: {
    padding: 16,
    backgroundColor: rnLightTheme.colors.paper,
    borderTopWidth: 1,
    borderColor: rnLightTheme.colors.rule,
  },
  publishBtn: {
    backgroundColor: rnLightTheme.colors.patina,
    borderRadius: rnLightTheme.radii.interactive,
    paddingVertical: 14,
    alignItems: 'center',
  },
  publishBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
});
