import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  View,
  TextInput as RNTextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { fetchWithAuth, AUTH_ENDPOINTS } from '@/services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleRequestReset = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(AUTH_ENDPOINTS.forgotPassword, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res?.success === false || res?.statusCode >= 400) {
        throw new Error(res?.message || 'Failed to send reset link.');
      }
      setSubmitted(true);
      Alert.alert('Success', 'Password reset link has been sent to your email!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background Gradient */}
      <LinearGradient
        colors={['#071120', '#0b2046', '#113264']}
        style={styles.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      {/* Decorative Glowing Ambient Circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <View style={styles.circle3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <VStack space="xs" style={styles.headerContainer}>
          <Box style={styles.logoBox}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Box>
          <Heading style={styles.headerTitle}>Postbell</Heading>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>AUTOMATION PANEL</Text>
          </View>
        </VStack>

        {/* ── MAIN CARD ───────────────────────────────────────────────────── */}
        <Box style={styles.card}>
          {/* Subtle Top Accent Indicator Line */}
          <View style={styles.cardTopAccent} />

          {!submitted ? (
            <VStack space="lg">
              <VStack space="xs">
                <Heading size="lg" style={styles.cardTitle}>
                  Forgot Password
                </Heading>
                <Text style={styles.cardSubtitle}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
              </VStack>

              {/* Email Field */}
              <VStack space="xs">
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
                  <Feather name="mail" size={18} color="#64748b" style={styles.inputIcon} />
                  <RNTextInput
                    placeholder="you@example.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (emailError) setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleRequestReset}
                    returnKeyType="done"
                    style={styles.textInput}
                  />
                </View>
                {!!emailError && (
                  <HStack space="xs" style={styles.errorContainer}>
                    <Feather name="alert-circle" size={13} color="#ef4444" />
                    <Text style={styles.errorText}>{emailError}</Text>
                  </HStack>
                )}
              </VStack>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRequestReset}
                disabled={isSubmitting || !email.trim()}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isSubmitting || !email.trim() ? ['#cbd5e1', '#94a3b8'] : ['#0b53f8', '#033ec0']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <HStack space="xs" style={styles.centerRow}>
                      <Text style={styles.submitButtonText}>Send Reset Link</Text>
                      <Feather name="send" size={16} color="#ffffff" />
                    </HStack>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={styles.backButtonContainer}
              >
                <HStack space="xs" style={styles.centerRow}>
                  <Feather name="arrow-left" size={15} color="#0b53f8" />
                  <Text style={styles.backButtonText}>Back to Sign In</Text>
                </HStack>
              </TouchableOpacity>
            </VStack>
          ) : (
            <VStack space="lg" style={styles.successContainer}>
              <View style={styles.successBadge}>
                <LinearGradient colors={['#dbeafe', '#eff6ff']} style={styles.successBadgeGradient}>
                  <Feather name="check-circle" size={42} color="#0b53f8" />
                </LinearGradient>
              </View>

              <VStack space="xs" style={styles.centerItems}>
                <Heading size="md" style={styles.successTitle}>
                  Check Your Email
                </Heading>
                <Text style={styles.successSubtitle}>
                  We've sent a password reset link to{' '}
                  <Text style={styles.highlightEmail}>{email}</Text>
                </Text>
              </VStack>

              <TouchableOpacity
                onPress={() => router.replace('/(auth)/login')}
                activeOpacity={0.85}
                style={styles.fullWidth}
              >
                <LinearGradient
                  colors={['#0b53f8', '#033ec0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  <HStack space="xs" style={styles.centerRow}>
                    <Text style={styles.submitButtonText}>Go to Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#ffffff" />
                  </HStack>
                </LinearGradient>
              </TouchableOpacity>
            </VStack>
          )}
        </Box>

        <Text style={styles.footerText}>© 2026 Postbell. All rights reserved.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  circle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(11, 83, 248, 0.12)',
    top: -100,
    right: -90,
  },
  circle2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: 80,
    left: -70,
  },
  circle3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(11, 83, 248, 0.08)',
    top: '40%',
    right: -40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginTop: 12,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 6,
  },
  badgeText: {
    color: '#93c5fd',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 26,
    shadowColor: '#0b53f8',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#0b53f8',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b53f8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  centerRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonContainer: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  backButtonText: {
    color: '#0b53f8',
    fontSize: 14,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    overflow: 'hidden',
  },
  successBadgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 83, 248, 0.2)',
    borderRadius: 40,
  },
  centerItems: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  highlightEmail: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  fullWidth: {
    width: '100%',
  },
  footerText: {
    color: '#93c5fd',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
    opacity: 0.8,
  },
});
