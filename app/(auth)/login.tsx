import React, { useState, useRef, useEffect } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TextInput as RNTextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

type Step = "email" | "otp";

export default function LoginScreen() {
  const { requestOtp, verifyOtp, resendOtp, isAuthenticated, isLoading } =
    useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [loginType, setLoginType] = useState<"user" | "customer">("user");
  const [requestId, setRequestId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailError, setEmailError] = useState("");

  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const validateEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setIsSubmitting(true);
    try {
      const res = await requestOtp(email, loginType);
      setRequestId(res?.requestId || res?.data?.requestId || "");
      setStep("otp");
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to send OTP. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      Alert.alert("Error", "Please enter the complete 6-digit OTP.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtp({ email, otp: otpCode, requestId, loginType });
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Invalid OTP", err?.message || "OTP verification failed.");
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
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to resend OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP input box handler ─────────────────────────────────────────────────
  const handleOtpChange = (val: string, index: number) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const logo = "/assets/images/Gemini_Generated_Image_logo.png";

  if (isLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background-0">
        <ActivityIndicator size="large" color="#193867" />
      </Box>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={["#0f2444", "#193867", "#1e4d8c"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <Box style={styles.circle1} />
      <Box style={styles.circle2} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <VStack space="sm" className="items-center mb-10 mt-16">
          <Box style={styles.logoBox}>
            <Text className="text-white font-bold text-4xl">P</Text>
            {/* <Image
              source={require("../../assets/images/Gemini_Generated_Image_logo.png")}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            /> */}
          </Box>
          <Heading
            size="2xl"
            className="text-white font-bold tracking-tight mt-3"
          >
            Postbell
          </Heading>
          <Text className="text-blue-200 text-sm text-center">
            Automation Panel
          </Text>
        </VStack>

        {/* ── CARD ────────────────────────────────────────────────────────── */}
        <Box style={styles.card}>
          {step === "email" ? (
            <VStack space="lg">
              <VStack space="xs">
                <Heading size="lg" className="text-typography-100 font-bold">
                  Sign In
                </Heading>
                <Text className="text-typography-400 text-sm">
                  Enter your email to receive a one-time password
                </Text>
              </VStack>

              {/* Account Type Toggle */}
              <VStack space="xs">
                <Text className="text-typography-500 font-medium text-sm">
                  Account Type
                </Text>
                <HStack style={styles.toggleContainer} className="w-full">
                  {(["customer", "user"] as const).map((type) => {
                    const isSelected = loginType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setLoginType(type)}
                        style={[
                          styles.toggleButton,
                          isSelected ? styles.toggleButtonActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.toggleButtonText,
                            isSelected ? styles.toggleButtonTextActive : null,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
              </VStack>

              {/* Email Field */}
              <VStack space="xs">
                <Text className="text-typography-500 font-medium text-sm">
                  Email Address
                </Text>
                <Input
                  size="lg"
                  isInvalid={!!emailError}
                  className="border-outline-200 bg-background-50 rounded-xl"
                >
                  <InputField
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      if (emailError) setEmailError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleRequestOtp}
                    returnKeyType="done"
                    className="text-typography-900"
                  />
                </Input>
                {!!emailError && (
                  <Text className="text-error-600 text-xs">{emailError}</Text>
                )}
              </VStack>

              <Button
                size="lg"
                onPress={handleRequestOtp}
                isDisabled={isSubmitting || !email.trim()}
                className="bg-primary-700 rounded-xl h-14"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ButtonText className="font-semibold text-base">
                    Send OTP
                  </ButtonText>
                )}
              </Button>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                <Text className="text-primary-500 text-center font-semibold text-sm mt-1">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </VStack>
          ) : (
            <VStack space="lg">
              {/* Back button */}
              <TouchableOpacity onPress={() => setStep("email")}>
                <HStack space="xs" className="items-center mb-1">
                  <Text className="text-primary-300 text-sm font-medium">
                    ← Change Email
                  </Text>
                </HStack>
              </TouchableOpacity>

              <VStack space="xs">
                <Heading size="lg" className="text-typography-100 font-bold">
                  Enter OTP
                </Heading>
                <Text className="text-typography-400 text-sm">
                  We sent a 6-digit code to{" "}
                  <Text className="text-primary-500 font-semibold">
                    {email}
                  </Text>
                </Text>
              </VStack>

              {/* OTP Boxes */}
              <HStack space="sm" className="justify-center my-2">
                {otp.map((digit, i) => (
                  <RNTextInput
                    key={i}
                    ref={(r) => {
                      otpRefs.current[i] = r;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
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

              <Button
                size="lg"
                onPress={handleVerifyOtp}
                isDisabled={isSubmitting || otp.join("").length < 6}
                className="bg-primary-700 rounded-xl h-14"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ButtonText className="font-semibold text-base">
                    Verify & Sign In
                  </ButtonText>
                )}
              </Button>

              {/* Resend */}
              <HStack className="justify-center items-center" space="xs">
                <Text className="text-typography-400 text-sm">
                  Didn't receive it?{" "}
                </Text>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resendCooldown > 0 || isSubmitting}
                >
                  <Text
                    className={`text-sm font-semibold ${resendCooldown > 0
                      ? "text-typography-400"
                      : "text-primary-500"
                      }`}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </HStack>
            </VStack>
          )}
        </Box>

        <Text className="text-blue-200 text-xs text-center mt-8 mb-6">
          © 2025 Postbell. All rights reserved.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -80,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.03)",
    bottom: 100,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    color: "#193867",
  },
  otpBoxFilled: {
    borderColor: "#193867",
    backgroundColor: "#eff6ff",
  },
  toggleContainer: {
    backgroundColor: "#f1f5f9",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    width: "100%",
  },
  toggleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "rgba(25, 56, 103, 0.15)",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  toggleButtonTextActive: {
    color: "#193867",
    fontWeight: "700",
  },
});
