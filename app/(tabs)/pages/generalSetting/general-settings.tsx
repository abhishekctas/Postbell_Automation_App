import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
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

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <HStack className="justify-between items-center px-5 pt-14 pb-5">
          <VStack space="xs">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <Heading size="xl" style={{ color: "#fff", marginTop: 4 }}>
              General Settings
            </Heading>
          </VStack>
        </HStack>
      </LinearGradient>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Box style={styles.tabRow}>
            {[
              { key: 0, label: "Basic Info" },
              { key: 1, label: "Social Media" },
              { key: 2, label: "AI Config" },
              { key: 3, label: "Advanced" },
              { key: 4, label: "Footer" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </Box>

          {activeTab === 0 && (
            <Box style={styles.card}>
              <Heading size="md" className="text-typography-100 mb-4">Company Identity</Heading>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Company Name *</Text>
                  <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder="Enter company name" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Company Email *</Text>
                  <TextInput style={styles.input} value={companyEmail} onChangeText={setCompanyEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Enter email address" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Company Phone *</Text>
                  <TextInput style={styles.input} value={companyPhone} onChangeText={setCompanyPhone} keyboardType="phone-pad" placeholder="Enter contact number" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Website URL</Text>
                  <TextInput style={styles.input} value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="https://example.com" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Address</Text>
                  <TextInput style={[styles.input, { minHeight: 60 }]} value={companyAddress} onChangeText={setCompanyAddress} multiline placeholder="Company official address" />
                </VStack>
              </VStack>
            </Box>
          )}

          {activeTab === 1 && (
            <Box style={styles.card}>
              <Heading size="md" className="text-typography-100 mb-4">Social Links</Heading>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Facebook URL</Text>
                  <TextInput style={styles.input} value={facebookUrl} onChangeText={setFacebookUrl} autoCapitalize="none" placeholder="Facebook page link" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Instagram URL</Text>
                  <TextInput style={styles.input} value={instagramUrl} onChangeText={setInstagramUrl} autoCapitalize="none" placeholder="Instagram profile link" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Twitter URL</Text>
                  <TextInput style={styles.input} value={twitterUrl} onChangeText={setTwitterUrl} autoCapitalize="none" placeholder="Twitter link" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>LinkedIn URL</Text>
                  <TextInput style={styles.input} value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" placeholder="LinkedIn corporate link" />
                </VStack>
              </VStack>
            </Box>
          )}

          {activeTab === 2 && (
            <Box style={styles.card}>
              <Heading size="md" className="text-typography-100 mb-4">AI API Configuration</Heading>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Gemini API Key</Text>
                  <TextInput style={styles.input} value={geminiApiKey} onChangeText={setGeminiApiKey} autoCapitalize="none" placeholder="Enter Gemini API key" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>OpenAI API Key</Text>
                  <TextInput style={styles.input} value={openaiApiKey} onChangeText={setOpenaiApiKey} autoCapitalize="none" placeholder="Enter OpenAI API key" />
                </VStack>
              </VStack>
            </Box>
          )}

          {activeTab === 3 && (
            <Box style={styles.card}>
              <Heading size="md" className="text-typography-100 mb-4">Advanced Settings</Heading>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Default Hashtags (comma separated)</Text>
                  <TextInput style={styles.input} value={defaultHashtags} onChangeText={setDefaultHashtags} placeholder="e.g. socialmedia, marketing, postbell" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Working Time</Text>
                  <TextInput style={styles.input} value={workingTime} onChangeText={setWorkingTime} placeholder="e.g. Mon-Fri 9am - 6pm" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Contact Address</Text>
                  <TextInput style={[styles.input, { minHeight: 60 }]} value={contactAddress} onChangeText={setContactAddress} multiline placeholder="Contact address" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Contact Number</Text>
                  <TextInput style={styles.input} value={contactNo} onChangeText={setContactNo} keyboardType="phone-pad" placeholder="Contact number" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} value={emailAddress} onChangeText={setEmailAddress} keyboardType="email-address" autoCapitalize="none" placeholder="Email address" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Location Address</Text>
                  <TextInput style={[styles.input, { minHeight: 60 }]} value={locationAddress} onChangeText={setLocationAddress} multiline placeholder="Location address" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>WhatsApp Number</Text>
                  <TextInput style={styles.input} value={whatsappNo} onChangeText={setWhatsappNo} keyboardType="phone-pad" placeholder="WhatsApp number" />
                </VStack>
              </VStack>
            </Box>
          )}

          {activeTab === 4 && (
            <Box style={styles.card}>
              <Heading size="md" className="text-typography-100 mb-4">Footer Information</Heading>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Footer Company Name</Text>
                  <TextInput style={styles.input} value={companyNameFooter} onChangeText={setCompanyNameFooter} placeholder="Footer company name" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>About Text (Footer)</Text>
                  <TextInput style={[styles.input, { minHeight: 70 }]} value={aboutText} onChangeText={setAboutText} multiline placeholder="Brief description about the portal" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.label}>Copyright Text</Text>
                  <TextInput style={styles.input} value={copyright} onChangeText={setCopyright} placeholder="e.g. © 2026 Postbell Inc. All rights reserved." />
                </VStack>
              </VStack>
            </Box>
          )}

          <Button size="lg" onPress={handleSave} isDisabled={saving} className="bg-primary-700 rounded-xl mb-8">
            {saving ? <ActivityIndicator color="#fff" /> : <ButtonText>Save Changes</ButtonText>}
          </Button>
        </ScrollView>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  scroll: { padding: 16, paddingBottom: 40 },
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  tabActive: { backgroundColor: "#193867", borderColor: "#193867" },
  tabText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
});
