import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import CustomerSetupWizard from './CustomerSetupWizard';

export default function CustomerGeneralSettingScreen() {
  return (
    <Box style={styles.container}>
      {/* Premium Header Banner */}
      <LinearGradient
        colors={['#193867', '#0b53f8', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Box style={styles.headerContent}>
          <HStack style={styles.headerRow}>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.headerTitle}>Customer General Settings</Heading>
              <Text style={styles.headerSubtitle}>
                Configure AI engine credentials, company profile, logo, social accounts & branding
              </Text>
            </VStack>
            <Box style={styles.iconContainer}>
              <Text style={styles.headerEmoji}>⚙️</Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Content Card Container */}
      <Box style={styles.mainCard}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CustomerSetupWizard />
        </ScrollView>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerGradient: {
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    paddingTop: 8,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 4,
    lineHeight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerEmoji: {
    fontSize: 22,
  },
  mainCard: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: -12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    overflow: 'hidden',
  },
  scroll: {
    padding: 12,
    paddingBottom: 110,
  },
});
