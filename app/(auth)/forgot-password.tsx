import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
import { fetchWithAuth, AUTH_ENDPOINTS } from "@/services/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleRequestReset = async () => {
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setIsSubmitting(true);
    try {
      const res = await fetchWithAuth(AUTH_ENDPOINTS.forgotPassword, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res?.success === false || res?.statusCode >= 400) {
        throw new Error(res?.message || "Failed to send reset link.");
      }
      setSubmitted(true);
      Alert.alert("Success", "Password reset link has been sent to your email!");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#0f2444", "#193867", "#1e4d8c"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Box style={styles.circle1} />
      <Box style={styles.circle2} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="sm" className="items-center mb-10 mt-16">
          <Box style={styles.logoBox}>
            <Text style={styles.logoText}>P</Text>
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

        <Box style={styles.card}>
          {!submitted ? (
            <VStack space="lg">
              <VStack space="xs">
                <Heading size="lg" className="text-typography-100 font-bold">
                  Forgot Password
                </Heading>
                <Text className="text-typography-400 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
              </VStack>

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
                    onSubmitEditing={handleRequestReset}
                    returnKeyType="done"
                    className="text-typography-100"
                  />
                </Input>
                {!!emailError && (
                  <Text className="text-error-600 text-xs">{emailError}</Text>
                )}
              </VStack>

              <Button
                size="lg"
                onPress={handleRequestReset}
                isDisabled={isSubmitting || !email.trim()}
                className="bg-primary-700 rounded-xl h-14"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ButtonText className="font-semibold text-base">
                    Send Reset Link
                  </ButtonText>
                )}
              </Button>

              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-primary-400 text-center font-semibold text-sm mt-2">
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </VStack>
          ) : (
            <VStack space="lg" className="items-center py-4">
              <Text style={{ fontSize: 48 }}>✉️</Text>
              <VStack space="xs" className="items-center">
                <Heading size="md" className="text-typography-100 font-bold text-center">
                  Check Your Email
                </Heading>
                <Text className="text-typography-400 text-sm text-center">
                  We've sent a password reset link to{" "}
                  <Text className="text-primary-500 font-semibold">{email}</Text>
                </Text>
              </VStack>
              <Button
                size="lg"
                onPress={() => router.replace("/(auth)/login")}
                className="bg-primary-700 rounded-xl w-full h-14 mt-4"
              >
                <ButtonText className="font-semibold text-base">
                  Go to Sign In
                </ButtonText>
              </Button>
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
});
