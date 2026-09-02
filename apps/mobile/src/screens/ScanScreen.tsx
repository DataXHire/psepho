import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { rnLightTheme } from '@psepho/tokens/react-native';

interface ScanScreenProps {
  onScanResult: (slug: string) => void;
}

export function ScanScreen({ onScanResult }: ScanScreenProps) {
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    let clean = manualCode.trim();
    // Parse URL if user pasted a link
    if (clean.includes('/p/')) {
      clean = clean.split('/p/')[1]?.split(/[?#/]/)[0] || clean;
    }
    if (clean.length >= 6) {
      onScanResult(clean);
    } else {
      Alert.alert('Invalid Code', 'Please enter a valid poll slug or URL.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan to Vote</Text>
      <Text style={styles.subtitle}>
        Point your camera at a room mode presentation QR code or enter the poll code directly.
      </Text>

      {/* Simulated Scanner Viewport */}
      <View style={styles.scannerBox}>
        <View style={styles.reticle} />
        <Text style={styles.scannerHint}>Align QR code inside target</Text>
      </View>

      {/* Manual Input Fallback */}
      <View style={styles.manualBox}>
        <Text style={styles.manualLabel}>Or enter poll code</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="e.g. EAT34NOW"
            placeholderTextColor={rnLightTheme.colors.slate}
            autoCapitalize="characters"
            style={styles.input}
          />
          <TouchableOpacity onPress={handleManualSubmit} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>Open</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.paper,
    padding: 24,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 27,
    fontWeight: '600',
    color: rnLightTheme.colors.ink,
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: rnLightTheme.colors.slate,
    lineHeight: 20,
    marginBottom: 24,
  },
  scannerBox: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.sheet,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 280,
    marginBottom: 24,
  },
  reticle: {
    width: 160,
    height: 160,
    borderWidth: 2,
    borderColor: rnLightTheme.colors.patina,
    borderRadius: 4,
    marginBottom: 16,
  },
  scannerHint: {
    fontSize: 12,
    color: rnLightTheme.colors.slate,
  },
  manualBox: {
    borderTopWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    paddingTop: 16,
    marginBottom: 20,
  },
  manualLabel: {
    fontSize: 12,
    color: rnLightTheme.colors.slate,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: rnLightTheme.colors.surface,
    borderWidth: 1,
    borderColor: rnLightTheme.colors.rule,
    borderRadius: rnLightTheme.radii.row,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: rnLightTheme.colors.ink,
  },
  submitBtn: {
    backgroundColor: rnLightTheme.colors.ink,
    borderRadius: rnLightTheme.radii.interactive,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  submitBtnText: {
    color: rnLightTheme.colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },
});
