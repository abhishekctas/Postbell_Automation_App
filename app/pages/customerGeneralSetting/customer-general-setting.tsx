import React from 'react';
import { StyleSheet, TouchableOpacity, Alert, Platform, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import CustomerSetupWizard from './CustomerSetupWizard';

export default function CustomerGeneralSettingScreen() {
  const { user, signOut } = useAuth();
  const isSetupIncomplete =
    user?.loginType === 'customer' && !user?.setup_completed && !user?.setupCompleted;

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        signOut();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]);
    }
  };

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
              <Heading style={styles.headerTitle}>
                {isSetupIncomplete ? 'Setup Configuration' : 'Customer General Settings'}
              </Heading>
              <Text style={styles.headerSubtitle}>
                {isSetupIncomplete
                  ? 'Complete your workspace setup to start automating posts'
                  : 'Configure AI engine credentials, company profile, logo, social accounts & branding'}
              </Text>
            </VStack>
            <HStack space="sm" style={{ alignItems: 'center' }}>
              {isSetupIncomplete ? (
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutButton}
                  activeOpacity={0.7}
                >
                  <Feather name="log-out" size={18} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <Box style={styles.iconContainer}>
                  <Text style={styles.headerEmoji}>⚙️</Text>
                </Box>
              )}
            </HStack>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Content Card Container */}
      <Box style={[styles.mainCard, isSetupIncomplete && styles.mainCardNoTabBar]}>
        <CustomerSetupWizard />
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
    paddingTop: 38,
    paddingBottom: 25,
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
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 2,
    lineHeight: 18,
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
  signOutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    marginBottom: 76,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  mainCardNoTabBar: {
    marginBottom: 16,
  },
});
