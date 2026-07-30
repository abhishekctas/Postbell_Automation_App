import React, { useState, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

type Step = 'email' | 'otp';

export default function LoginScreen() {
  const { requestOtp, verifyOtp, resendOtp, isAuthenticated, isLoading } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loginType, setLoginType] = useState<'user' | 'customer'>('user');
  const [requestId, setRequestId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState('');

  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    setIsSubmitting(true);
    try {
      const res = await requestOtp(email, loginType);
      setRequestId(res?.requestId || res?.data?.requestId || '');
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send OTP. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtp({ email, otp: otpCode, requestId, loginType });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Invalid OTP', err?.message || 'OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      const res = await resendOtp({ email, loginType, requestId });
      setRequestId(res?.requestId || res?.data?.requestId || requestId);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP input box handler ─────────────────────────────────────────────────
  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  if (isLoading) {
    return (
      <Box style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b53f8" />
      </Box>
    );
  }

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

          {step === 'email' ? (
            <VStack space="lg">
              <VStack space="xs">
                <Heading size="lg" style={styles.cardTitle}>
                  Sign In
                </Heading>
                <Text style={styles.cardSubtitle}>
                  Enter your email to receive a one-time password
                </Text>
              </VStack>

              {/* Account Type Toggle */}
              <VStack space="xs">
                <Text style={styles.fieldLabel}>Account Type</Text>
                <HStack style={styles.toggleContainer} className="w-full">
                  {(['customer', 'user'] as const).map((type) => {
                    const isSelected = loginType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setLoginType(type)}
                        activeOpacity={0.8}
                        style={[styles.toggleButton, isSelected ? styles.toggleButtonActive : null]}
                      >
                        <HStack space="xs" style={styles.centerRow}>
                          <Feather
                            name={type === 'customer' ? 'users' : 'user-check'}
                            size={14}
                            color={isSelected ? '#0b53f8' : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.toggleButtonText,
                              isSelected ? styles.toggleButtonTextActive : null,
                            ]}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </HStack>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
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
                    onSubmitEditing={handleRequestOtp}
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
                onPress={handleRequestOtp}
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
                      <Text style={styles.submitButtonText}>Send OTP</Text>
                      <Feather name="arrow-right" size={18} color="#ffffff" />
                    </HStack>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                activeOpacity={0.7}
                style={styles.forgotPassContainer}
              >
                <HStack space="xs" style={styles.centerRow}>
                  <Feather name="key" size={13} color="#0b53f8" />
                  <Text style={styles.forgotPassText}>
                    Forgot Password?
                  </Text>
                </HStack>
              </TouchableOpacity> */}
            </VStack>
          ) : (
            <VStack space="lg">
              {/* Back button */}
              <TouchableOpacity
                onPress={() => setStep('email')}
                activeOpacity={0.7}
                style={styles.backButton}
              >
                <HStack space="xs" style={styles.centerRowLeft}>
                  <Feather name="arrow-left" size={16} color="#0b53f8" />
                  <Text style={styles.backButtonText}>Change Email</Text>
                </HStack>
              </TouchableOpacity>

              <VStack space="xs">
                <Heading size="lg" style={styles.cardTitle}>
                  Enter OTP
                </Heading>
                <Text style={styles.cardSubtitle}>
                  We sent a 6-digit verification code to{' '}
                  <Text style={styles.highlightEmail}>{email}</Text>
                </Text>
              </VStack>

              {/* OTP Boxes */}
              <HStack space="sm" style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <RNTextInput
                    key={i}
                    ref={(r) => {
                      otpRefs.current[i] = r;
                    }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </HStack>

              {/* Verify Button */}
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={isSubmitting || otp.join('').length < 6}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isSubmitting || otp.join('').length < 6
                      ? ['#cbd5e1', '#94a3b8']
                      : ['#0b53f8', '#033ec0']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <HStack space="xs" style={styles.centerRow}>
                      <Feather name="check-circle" size={18} color="#ffffff" />
                      <Text style={styles.submitButtonText}>Verify & Sign In</Text>
                    </HStack>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend */}
              <HStack style={styles.centerRow} space="xs">
                <Text style={styles.resendPromptText}>Didn't receive it? </Text>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.resendLinkText,
                      resendCooldown > 0 ? styles.resendDisabledText : null,
                    ]}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </HStack>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071120',
  },
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
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'white',
    // backgroundColor: "rgba(255,255,255,0.15)",
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
    width: 70,
    height: 70,
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
  toggleContainer: {
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(11, 83, 248, 0.2)',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleButtonTextActive: {
    color: '#0b53f8',
    fontWeight: '700',
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
  centerRowLeft: {
    alignItems: 'center',
  },
  forgotPassContainer: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginTop: 4,
  },
  forgotPassText: {
    color: '#0b53f8',
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#0b53f8',
    fontSize: 14,
    fontWeight: '700',
  },
  highlightEmail: {
    color: '#0b53f8',
    fontWeight: '700',
  },
  otpRow: {
    justifyContent: 'center',
    marginVertical: 8,
  },
  otpBox: {
    width: 44,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  otpBoxFilled: {
    borderColor: '#0b53f8',
    backgroundColor: '#eff6ff',
    color: '#0b53f8',
  },
  resendPromptText: {
    color: '#64748b',
    fontSize: 14,
  },
  resendLinkText: {
    color: '#0b53f8',
    fontSize: 14,
    fontWeight: '700',
  },
  resendDisabledText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  footerText: {
    color: '#93c5fd',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
    opacity: 0.8,
  },
});
