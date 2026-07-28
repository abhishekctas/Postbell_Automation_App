import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getGeneralSettings, createOrUpdateGeneralSettings, GeneralSettings } from "./general-settings.api";
import { router } from "expo-router";

export default function GeneralAccessScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [defaultHashtags, setDefaultHashtags] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [copyright, setCopyright] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [contactAddress, setContactAddress] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [whatsappNo, setWhatsappNo] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [workingTime, setWorkingTime] = useState("");
  const [companyNameFooter, setCompanyNameFooter] = useState("");

  const fetchSettings = async () => {
    try {
      const data = await getGeneralSettings();
      if (data) {
        setCompanyName(data.company_name || "");
        setCompanyEmail(data.company_email || "");
        setCompanyPhone(data.company_phone || "");
        setCompanyAddress(data.company_address || "");
        setWebsite(data.website || "");
        setLogoUrl(data.logo_url || "");
        setFacebookUrl(data.social_links?.facebook_url || "");
        setInstagramUrl(data.social_links?.instagram_url || "");
        setTwitterUrl(data.social_links?.twitter_url || "");
        setLinkedinUrl(data.social_links?.linkedin_url || "");
        setDefaultHashtags(data.default_hashtags?.join(", ") || "");
        setAboutText(data.about_text || "");
        setCopyright(data.copyright || "");
        setContactAddress(data.contact_address || "");
        setContactNo(data.contact_no || "");
        setEmailAddress(data.email_address || "");
        setLocationAddress(data.location_address || "");
        setWhatsappNo(data.whatsapp_no || "");
        setGeminiApiKey(data.gemini_api_key || "");
        setOpenaiApiKey(data.openai_api_key || "");
        setWorkingTime(data.working_time || "");
        setCompanyNameFooter(data.company_name_footer || "");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load general settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Permission to access gallery is required to select a logo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setLogoUrl(uri);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick logo image.");
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert("Validation Error", "Company name is required.");
      return;
    }
    if (!companyEmail.trim() || !companyEmail.includes("@")) {
      Alert.alert("Validation Error", "Please enter a valid company email.");
      return;
    }
    if (!companyPhone.trim()) {
      Alert.alert("Validation Error", "Company phone is required.");
      return;
    }

    setSaving(true);
    try {
      const hashtagsArray = defaultHashtags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const payload: Partial<GeneralSettings> = {
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_address: companyAddress,
        website: website,
        logo_url: logoUrl,
        social_links: {
          facebook_url: facebookUrl,
          instagram_url: instagramUrl,
          twitter_url: twitterUrl,
          linkedin_url: linkedinUrl,
        },
        default_hashtags: hashtagsArray,
        about_text: aboutText,
        copyright: copyright,
        contact_address: contactAddress,
        contact_no: contactNo,
        email_address: emailAddress,
        location_address: locationAddress,
        whatsapp_no: whatsappNo,
        gemini_api_key: geminiApiKey,
        openai_api_key: openaiApiKey,
        working_time: workingTime,
        company_name_footer: companyNameFooter,
      };

      await createOrUpdateGeneralSettings(payload);
      Alert.alert("Success", "General settings saved successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { key: 0, label: "Basic Info", icon: "info" as const },
    { key: 1, label: "Social Media", icon: "share-2" as const },
    { key: 2, label: "AI Config", icon: "cpu" as const },
    { key: 3, label: "Advanced", icon: "sliders" as const },
    { key: 4, label: "Footer", icon: "layout" as const },
  ];

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header Banner */}
      <LinearGradient
        colors={["#2563EB", "#1D4ED8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Box style={styles.headerGlow} />
        <Box style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <HStack style={{ justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <VStack style={{ flex: 1, paddingRight: 15 }}>
              <Heading style={styles.headerTitle}>General Settings</Heading>
              <Text style={styles.headerSubtitle}>
                Manage company profile, logo, social links, AI credentials & footer
              </Text>
            </VStack>
            <Box style={styles.iconContainer}>
              <Text style={styles.headerEmoji}>⚙️</Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Main Content Card */}
      <Box style={styles.mainCard}>
        {loading ? (
          <Box className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0b53f8" />
          </Box>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Step Tabs Navigation */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContent}
              style={{ marginBottom: 20, maxHeight: 46 }}
            >
              {steps.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tab, isActive && styles.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name={tab.icon}
                      size={15}
                      color={isActive ? "#ffffff" : "#64748b"}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* STEP 0: BASIC INFO */}
            {activeTab === 0 && (
              <Box style={styles.card}>
                <HStack style={styles.cardHeader}>
                  <Box style={styles.cardIconBox}>
                    <Feather name="info" size={18} color="#0b53f8" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Heading style={styles.cardTitle}>Company Information</Heading>
                    <Text style={styles.cardSubtitle}>Basic organizational profile, contact & logo</Text>
                  </VStack>
                </HStack>

                <VStack space="md" style={styles.formStack}>
                  <VStack space="xs">
                    <Text style={styles.label}>Company Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Enter company name"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Company Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={companyEmail}
                      onChangeText={setCompanyEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Enter email address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Company Phone *</Text>
                    <TextInput
                      style={styles.input}
                      value={companyPhone}
                      onChangeText={setCompanyPhone}
                      keyboardType="phone-pad"
                      placeholder="Enter contact number"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Website URL</Text>
                    <TextInput
                      style={styles.input}
                      value={website}
                      onChangeText={setWebsite}
                      autoCapitalize="none"
                      placeholder="https://example.com"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Company Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={companyAddress}
                      onChangeText={setCompanyAddress}
                      multiline
                      numberOfLines={3}
                      placeholder="Enter company address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  {/* Company Logo Upload Section */}
                  <VStack space="xs" style={{ marginTop: 8 }}>
                    <Text style={styles.label}>Company Logo</Text>
                    <Box style={styles.logoContainer}>
                      <HStack style={{ alignItems: "center" }} space="md">
                        <Box style={styles.logoPreviewBox}>
                          {logoUrl ? (
                            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                          ) : (
                            <Feather name="image" size={26} color="#94a3b8" />
                          )}
                        </Box>
                        <VStack space="xs" style={{ flex: 1 }}>
                          <HStack space="sm" style={{ flexWrap: "wrap", gap: 8 }}>
                            <TouchableOpacity
                              style={styles.uploadLogoBtn}
                              onPress={handlePickLogo}
                              activeOpacity={0.8}
                            >
                              <Feather name="upload" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                              <Text style={styles.uploadLogoText}>
                                {logoUrl ? "Change Logo" : "Upload Logo"}
                              </Text>
                            </TouchableOpacity>

                            {logoUrl ? (
                              <TouchableOpacity
                                style={styles.removeLogoBtn}
                                onPress={() => setLogoUrl("")}
                                activeOpacity={0.8}
                              >
                                <Feather name="trash-2" size={14} color="#dc2626" />
                              </TouchableOpacity>
                            ) : null}
                          </HStack>
                          <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                            JPG, PNG or GIF · Max 5 MB
                          </Text>
                        </VStack>
                      </HStack>

                      {/* Direct Logo URL TextInput */}
                      <VStack space="xs" style={{ marginTop: 10 }}>
                        <Text style={[styles.label, { fontSize: 10, color: "#94a3b8" }]}>
                          Direct Logo URL (Optional)
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={logoUrl}
                          onChangeText={setLogoUrl}
                          autoCapitalize="none"
                          placeholder="https://example.com/logo.png"
                          placeholderTextColor="#94a3b8"
                        />
                      </VStack>
                    </Box>
                  </VStack>
                </VStack>
              </Box>
            )}

            {/* STEP 1: SOCIAL MEDIA */}
            {activeTab === 1 && (
              <Box style={styles.card}>
                <HStack style={styles.cardHeader}>
                  <Box style={styles.cardIconBox}>
                    <Feather name="share-2" size={18} color="#0b53f8" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Heading style={styles.cardTitle}>Social Links</Heading>
                    <Text style={styles.cardSubtitle}>Corporate social media handles & profile links</Text>
                  </VStack>
                </HStack>

                <VStack space="md" style={styles.formStack}>
                  <VStack space="xs">
                    <Text style={styles.label}>Facebook URL</Text>
                    <TextInput
                      style={styles.input}
                      value={facebookUrl}
                      onChangeText={setFacebookUrl}
                      autoCapitalize="none"
                      placeholder="Facebook page link"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Instagram URL</Text>
                    <TextInput
                      style={styles.input}
                      value={instagramUrl}
                      onChangeText={setInstagramUrl}
                      autoCapitalize="none"
                      placeholder="Instagram profile link"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Twitter URL</Text>
                    <TextInput
                      style={styles.input}
                      value={twitterUrl}
                      onChangeText={setTwitterUrl}
                      autoCapitalize="none"
                      placeholder="Twitter profile link"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>LinkedIn URL</Text>
                    <TextInput
                      style={styles.input}
                      value={linkedinUrl}
                      onChangeText={setLinkedinUrl}
                      autoCapitalize="none"
                      placeholder="LinkedIn corporate link"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>
                </VStack>
              </Box>
            )}

            {/* STEP 2: AI CONFIG */}
            {activeTab === 2 && (
              <Box style={styles.card}>
                <HStack style={styles.cardHeader}>
                  <Box style={styles.cardIconBox}>
                    <Feather name="cpu" size={18} color="#0b53f8" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Heading style={styles.cardTitle}>AI API Configuration</Heading>
                    <Text style={styles.cardSubtitle}>Configure Google Gemini & OpenAI credentials</Text>
                  </VStack>
                </HStack>

                <VStack space="md" style={styles.formStack}>
                  <VStack space="xs">
                    <Text style={styles.label}>Gemini API Key</Text>
                    <TextInput
                      style={styles.input}
                      value={geminiApiKey}
                      onChangeText={setGeminiApiKey}
                      autoCapitalize="none"
                      secureTextEntry
                      placeholder="Enter Gemini API key"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>OpenAI API Key</Text>
                    <TextInput
                      style={styles.input}
                      value={openaiApiKey}
                      onChangeText={setOpenaiApiKey}
                      autoCapitalize="none"
                      secureTextEntry
                      placeholder="Enter OpenAI API key"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>
                </VStack>
              </Box>
            )}

            {/* STEP 3: ADVANCED */}
            {activeTab === 3 && (
              <Box style={styles.card}>
                <HStack style={styles.cardHeader}>
                  <Box style={styles.cardIconBox}>
                    <Feather name="sliders" size={18} color="#0b53f8" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Heading style={styles.cardTitle}>Advanced Settings</Heading>
                    <Text style={styles.cardSubtitle}>Default hashtags, support hours & location details</Text>
                  </VStack>
                </HStack>

                <VStack space="md" style={styles.formStack}>
                  <VStack space="xs">
                    <Text style={styles.label}>Default Hashtags (comma separated)</Text>
                    <TextInput
                      style={styles.input}
                      value={defaultHashtags}
                      onChangeText={setDefaultHashtags}
                      placeholder="e.g. socialmedia, marketing, postbell"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Working Time</Text>
                    <TextInput
                      style={styles.input}
                      value={workingTime}
                      onChangeText={setWorkingTime}
                      placeholder="e.g. Mon-Fri 9am - 6pm"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Contact Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={contactAddress}
                      onChangeText={setContactAddress}
                      multiline
                      numberOfLines={3}
                      placeholder="Contact address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Contact Number</Text>
                    <TextInput
                      style={styles.input}
                      value={contactNo}
                      onChangeText={setContactNo}
                      keyboardType="phone-pad"
                      placeholder="Contact number"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Email address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Location Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={locationAddress}
                      onChangeText={setLocationAddress}
                      multiline
                      numberOfLines={3}
                      placeholder="Location address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>WhatsApp Number</Text>
                    <TextInput
                      style={styles.input}
                      value={whatsappNo}
                      onChangeText={setWhatsappNo}
                      keyboardType="phone-pad"
                      placeholder="WhatsApp number"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>
                </VStack>
              </Box>
            )}

            {/* STEP 4: FOOTER */}
            {activeTab === 4 && (
              <Box style={styles.card}>
                <HStack style={styles.cardHeader}>
                  <Box style={styles.cardIconBox}>
                    <Feather name="layout" size={18} color="#0b53f8" />
                  </Box>
                  <VStack style={{ flex: 1 }}>
                    <Heading style={styles.cardTitle}>Footer Information</Heading>
                    <Text style={styles.cardSubtitle}>
                      Configure branding, contact details & copyright for portal footer
                    </Text>
                  </VStack>
                </HStack>

                <VStack space="md" style={styles.formStack}>
                  {/* Branding Fields */}
                  <VStack space="xs">
                    <Text style={styles.label}>Footer Company Name</Text>
                    <TextInput
                      style={styles.input}
                      value={companyNameFooter}
                      onChangeText={setCompanyNameFooter}
                      placeholder="Footer company name"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Contact Email</Text>
                    <TextInput
                      style={styles.input}
                      value={emailAddress}
                      onChangeText={setEmailAddress}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="Contact email address"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Contact Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={contactNo}
                      onChangeText={setContactNo}
                      keyboardType="phone-pad"
                      placeholder="Contact phone number"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>WhatsApp Number</Text>
                    <TextInput
                      style={styles.input}
                      value={whatsappNo}
                      onChangeText={setWhatsappNo}
                      keyboardType="phone-pad"
                      placeholder="WhatsApp number"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Working Hours</Text>
                    <TextInput
                      style={styles.input}
                      value={workingTime}
                      onChangeText={setWorkingTime}
                      placeholder="Mon–Fri: 9 AM – 6 PM"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Copyright Text</Text>
                    <TextInput
                      style={styles.input}
                      value={copyright}
                      onChangeText={setCopyright}
                      placeholder="e.g. © 2026 Your Company. All rights reserved."
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>About Text (Footer)</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={aboutText}
                      onChangeText={setAboutText}
                      multiline
                      numberOfLines={4}
                      placeholder="Brief description about the portal"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Contact Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={contactAddress}
                      onChangeText={setContactAddress}
                      multiline
                      numberOfLines={3}
                      placeholder="Contact address for footer"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.label}>Location Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={locationAddress}
                      onChangeText={setLocationAddress}
                      multiline
                      numberOfLines={3}
                      placeholder="Location address for footer"
                      placeholderTextColor="#94a3b8"
                    />
                  </VStack>
                </VStack>
              </Box>
            )}

            {/* Submit Action Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            >
              <LinearGradient
                colors={saving ? ["#94a3b8", "#64748b"] : ["#0b53f8", "#023eb9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <HStack style={{ alignItems: "center", justifyContent: "center" }}>
                    <Feather name="check-circle" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </HStack>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  headerContent: {
    zIndex: 2,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  backIcon: { color: "#fff", fontSize: 20, fontWeight: "600", marginRight: 4 },
  backText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  headerTitle: { color: "#ffffff", fontSize: 26, fontWeight: "800", marginBottom: 4 },
  headerSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerEmoji: { fontSize: 26 },

  mainCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  scroll: {
    padding: 16,
    paddingBottom: 110,
  },
  tabScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tabActive: {
    backgroundColor: "#0b53f8",
    borderColor: "#0b53f8",
  },
  tabText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  formStack: {
    gap: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  logoContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginTop: 4,
  },
  logoPreviewBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  uploadLogoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b53f8",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadLogoText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  removeLogoBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#0b53f8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnGradient: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
