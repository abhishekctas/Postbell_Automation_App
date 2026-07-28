import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  TextInput,
  Platform,
  Switch,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getPost,
  createPost,
  updatePost,
  publishPostNow,
  getAllSocialAccountsForPost,
  generateSocialMediaPost,
  Post,
} from "./posts.api";

const SOCIAL_PLATFORMS = [
  { id: "facebook", label: "Facebook", icon: "facebook-square", color: "#1877f2" },
  { id: "instagram", label: "Instagram", icon: "instagram", color: "#e1306c" },
  { id: "whatsapp", label: "WhatsApp", icon: "whatsapp", color: "#25d366" },
  { id: "twitter", label: "Twitter", icon: "twitter", color: "#1da1f2" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin", color: "#0a66c2" },
  { id: "youtube", label: "YouTube", icon: "youtube-play", color: "#ff0000" },
];

export default function PostEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("manual");
  const [previewTab, setPreviewTab] = useState<"facebook" | "instagram" | "whatsapp">("facebook");

  // AI Auto Post State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"auto" | "gemini" | "openai">("auto");
  const [aiRefImage, setAiRefImage] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ title?: string; caption?: string; hashtags?: string[] } | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [postStatus, setPostStatus] = useState<"draft" | "scheduled" | "published">("draft");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Platform-Specific Content Overrides
  const [activePlatformTab, setActivePlatformTab] = useState<string>("general");
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, { caption: string; image_url: string }>>({});

  // Connected Social Accounts
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch Post Details for Edit Mode & Fetch Social Accounts
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch active social accounts
        try {
          const accountsRes = await getAllSocialAccountsForPost();
          if (Array.isArray(accountsRes)) {
            setSocialAccounts(accountsRes);
          } else if (accountsRes?.data && Array.isArray(accountsRes.data)) {
            setSocialAccounts(accountsRes.data);
          }
        } catch {
          // Default fallback if social accounts fetch fails
        }

        if (id) {
          const postData: Post = await getPost(id);
          setTitle(postData.title || "");
          setCaption(postData.caption || "");
          setHashtagsInput((postData.hashtags || []).join(", "));
          setImageUrl(typeof postData.image_url === "string" ? postData.image_url : "");
          if (postData.selectedNetworks && postData.selectedNetworks.length > 0) {
            setSelectedPlatforms(postData.selectedNetworks);
          }
          if (postData.post_status) {
            setPostStatus(postData.post_status as any);
          }
          if (postData.scheduled_at) {
            setIsScheduled(true);
            setScheduledDate(new Date(postData.scheduled_at));
          }
        }
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load post data.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Image Picker
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (activeTab === "ai") {
          setAiRefImage(uri);
        } else if (activePlatformTab === "general") {
          setImageUrl(uri);
        } else {
          setPlatformOverrides((prev) => ({
            ...prev,
            [activePlatformTab]: { ...prev[activePlatformTab], image_url: uri, caption: prev[activePlatformTab]?.caption || "" },
          }));
        }
      }
    } catch {
      Alert.alert("Error", "Failed to pick image from gallery.");
    }
  };

  // AI Generation Handler
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) {
      setErrors((prev) => ({ ...prev, aiPrompt: "Prompt is required to generate AI post." }));
      return;
    }
    setErrors((prev) => ({ ...prev, aiPrompt: "" }));
    setAiGenerating(true);
    try {
      const res = await generateSocialMediaPost({
        prompt: aiPrompt,
        provider: aiProvider,
        platform: selectedPlatforms[0] || "facebook",
      });
      const generatedPost = res?.posts?.[0] || res?.data?.posts?.[0] || res;
      const genTitle = generatedPost?.title || aiPrompt;
      const genCaption = generatedPost?.caption || generatedPost?.post_content || "";
      const genHashtags = generatedPost?.hashtags || [];

      setAiResult({
        title: genTitle,
        caption: genCaption,
        hashtags: Array.isArray(genHashtags) ? genHashtags : [],
      });
    } catch (err: any) {
      Alert.alert("AI Generation Error", err.message || "Failed to generate post using AI.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Apply AI Content into Form
  const applyAiContent = () => {
    if (!aiResult) return;
    if (aiResult.title) setTitle(aiResult.title);
    if (aiResult.caption) setCaption(aiResult.caption);
    if (aiResult.hashtags && aiResult.hashtags.length > 0) {
      setHashtagsInput(aiResult.hashtags.join(", "));
    }
    setActiveTab("manual");
    Alert.alert("Applied!", "AI content has been transferred to the Manual Post Composer.");
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!caption.trim() && !title.trim() && !imageUrl) {
      newErrors.main = "Please provide at least a Title, Caption, or Image for your post.";
    }
    if (selectedPlatforms.length === 0) {
      newErrors.platforms = "Select at least one social platform.";
    }
    if (isScheduled && scheduledDate < new Date()) {
      newErrors.schedule = "Scheduled date/time must be in the future.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save / Publish Post
  const handleSavePost = async (targetStatus?: "draft" | "published" | "scheduled") => {
    if (!validateForm()) {
      Alert.alert("Validation Error", errors.main || errors.platforms || errors.schedule || "Please fix validation errors.");
      return;
    }

    setSaving(true);
    try {
      const hashtagsArray = hashtagsInput
        .split(",")
        .map((h) => h.trim().replace(/^#/, ""))
        .filter(Boolean);

      const finalStatus = targetStatus || (isScheduled ? "scheduled" : postStatus);

      const payload: Partial<Post> = {
        title: title || caption.slice(0, 30) || "Untitled Post",
        caption,
        hashtags: hashtagsArray,
        image_url: imageUrl || undefined,
        selectedNetworks: selectedPlatforms,
        post_status: finalStatus,
        scheduled_at: isScheduled ? scheduledDate.toISOString() : undefined,
      };

      if (isEditing && id) {
        await updatePost(id, payload);
        if (targetStatus === "published") {
          await publishPostNow(id);
        }
        Alert.alert("Success", "Post updated successfully!");
      } else {
        const created = await createPost(payload);
        const newId = created?._id || created?.id || created?.data?._id;
        if (targetStatus === "published" && newId) {
          await publishPostNow(newId);
        }
        Alert.alert("Success", "Post created successfully!");
      }

      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save post.");
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (pId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(pId) ? prev.filter((x) => x !== pId) : [...prev, pId]
    );
  };

  if (loading) {
    return (
      <Box className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#0052d4" />
        <Text style={{ marginTop: 12, color: "#64748b" }}>Loading Post Editor...</Text>
      </Box>
    );
  }

  const currentDisplayCaption =
    activePlatformTab !== "general" && platformOverrides[activePlatformTab]?.caption
      ? platformOverrides[activePlatformTab].caption
      : caption;

  const currentDisplayImage =
    activePlatformTab !== "general" && platformOverrides[activePlatformTab]?.image_url
      ? platformOverrides[activePlatformTab].image_url
      : imageUrl;

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header} className="px-5 pt-14 pb-4">
        <HStack className="justify-between items-center">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Heading size="lg" style={{ color: "#fff", fontWeight: "700" }}>
            {isEditing ? "Edit Post" : "Add New Post"}
          </Heading>
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={() => handleSavePost("published")}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.headerSaveText}>Publish</Text>
            )}
          </TouchableOpacity>
        </HStack>

        {/* Main Tab Bar (AI Auto Post vs Manual Posting) */}
        <HStack style={styles.mainTabBar} className="mt-4">
          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === "ai" && styles.mainTabBtnActive]}
            onPress={() => setActiveTab("ai")}
          >
            <Feather name="cpu" size={16} color={activeTab === "ai" ? "#0052d4" : "#64748b"} style={{ marginRight: 6 }} />
            <Text style={[styles.mainTabLabel, activeTab === "ai" && styles.mainTabLabelActive]}>
              AI Auto Post
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === "manual" && styles.mainTabBtnActive]}
            onPress={() => setActiveTab("manual")}
          >
            <Feather name="edit-3" size={16} color={activeTab === "manual" ? "#0052d4" : "#64748b"} style={{ marginRight: 6 }} />
            <Text style={[styles.mainTabLabel, activeTab === "manual" && styles.mainTabLabelActive]}>
              Manual Posting
            </Text>
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ================================================================= */}
        {/* TAB 1: AI AUTO POST */}
        {/* ================================================================= */}
        {activeTab === "ai" && (
          <VStack space="md">
            <Box style={styles.card}>
              <Heading size="sm" style={styles.cardTitle}>
                🤖 Generate Post with AI
              </Heading>
              <Text style={styles.cardSub}>
                Describe your post topic or campaign idea, and AI will auto-generate copy, hashtags, and format.
              </Text>

              {/* Prompt Input */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>AI Prompt / Campaign Idea *</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput, errors.aiPrompt ? styles.inputError : null]}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  placeholder="e.g. Write an engaging social post for a 20% weekend discount on summer collection..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                />
                {errors.aiPrompt && <Text style={styles.errorText}>{errors.aiPrompt}</Text>}
              </VStack>

              {/* AI Model Selector */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Select AI Model</Text>
                <HStack space="xs" className="mt-1">
                  {(["auto", "gemini", "openai"] as const).map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[styles.providerChip, aiProvider === prov && styles.providerChipActive]}
                      onPress={() => setAiProvider(prov)}
                    >
                      <Text style={[styles.providerChipText, aiProvider === prov && styles.providerChipTextActive]}>
                        {prov === "auto" ? "⚡ Auto" : prov === "gemini" ? "🔷 Gemini" : "🟢 OpenAI"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              {/* Reference Image Attachment */}
              <VStack style={{ marginTop: 14 }}>
                <Text style={styles.inputLabel}>Optional Reference Image</Text>
                {aiRefImage ? (
                  <Box style={styles.imagePreviewBox}>
                    <Image source={{ uri: aiRefImage }} style={styles.uploadedImage} />
                    <TouchableOpacity onPress={() => setAiRefImage("")} style={styles.removeImgBtn}>
                      <Feather name="trash-2" size={16} color="#fff" />
                    </TouchableOpacity>
                  </Box>
                ) : (
                  <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    <Feather name="image" size={24} color="#0052d4" />
                    <Text style={styles.uploadText}>Attach Reference Image</Text>
                  </TouchableOpacity>
                )}
              </VStack>

              {/* Generate Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 16 }]}
                onPress={handleGenerateAi}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Generate AI Post</Text>
                  </>
                )}
              </TouchableOpacity>
            </Box>

            {/* AI Generated Result Preview Card */}
            {aiResult && (
              <Box style={[styles.card, styles.aiResultCard]}>
                <HStack className="justify-between items-center mb-2">
                  <Heading size="xs" style={{ color: "#0052d4", fontWeight: "700" }}>
                    ✨ AI Generated Output
                  </Heading>
                  <TouchableOpacity style={styles.applyBtn} onPress={applyAiContent}>
                    <Text style={styles.applyBtnText}>Apply to Composer →</Text>
                  </TouchableOpacity>
                </HStack>

                {aiResult.title && (
                  <Text style={{ fontWeight: "700", color: "#0f172a", fontSize: 14, marginBottom: 4 }}>
                    {aiResult.title}
                  </Text>
                )}
                <Text style={{ color: "#334155", fontSize: 13, lineHeight: 20 }}>
                  {aiResult.caption}
                </Text>
                {aiResult.hashtags && aiResult.hashtags.length > 0 && (
                  <HStack space="xs" className="flex-wrap mt-2">
                    {aiResult.hashtags.map((tag, idx) => (
                      <Box key={idx} style={styles.tagChip}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </Box>
                    ))}
                  </HStack>
                )}
              </Box>
            )}
          </VStack>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MANUAL POSTING COMPOSER */}
        {/* ================================================================= */}
        {activeTab === "manual" && (
          <VStack space="md">
            {/* Form Validation Global Error Banner */}
            {errors.main && (
              <Box style={styles.errorBanner}>
                <Feather name="alert-circle" size={18} color="#dc2626" style={{ marginRight: 8 }} />
                <Text style={{ color: "#dc2626", fontSize: 13, fontWeight: "600", flex: 1 }}>
                  {errors.main}
                </Text>
              </Box>
            )}

            {/* Target Platforms Picker */}
            <Box style={styles.card}>
              <Heading size="sm" style={styles.cardTitle}>
                🌐 Select Target Social Platforms *
              </Heading>
              {errors.platforms && <Text style={styles.errorText}>{errors.platforms}</Text>}

              <HStack space="xs" className="flex-wrap mt-3">
                {SOCIAL_PLATFORMS.map((plat) => {
                  const isSelected = selectedPlatforms.includes(plat.id);
                  return (
                    <TouchableOpacity
                      key={plat.id}
                      style={[styles.platformPill, isSelected && styles.platformPillActive]}
                      onPress={() => togglePlatform(plat.id)}
                    >
                      <FontAwesome name={plat.icon as any} size={16} color={isSelected ? "#fff" : plat.color} />
                      <Text style={[styles.platformPillLabel, isSelected && styles.platformPillLabelActive]}>
                        {plat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>

              {/* Connected Accounts Info */}
              {socialAccounts.length > 0 && (
                <VStack style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                  <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                    Connected Accounts ({socialAccounts.length})
                  </Text>
                  <HStack space="xs" className="flex-wrap mt-1">
                    {socialAccounts.map((acc, idx) => (
                      <Box key={idx} style={styles.accountBadge}>
                        <Text style={{ fontSize: 11, color: "#334155" }}>
                          @{acc.username || acc.account_name || "account"}
                        </Text>
                      </Box>
                    ))}
                  </HStack>
                </VStack>
              )}
            </Box>

            {/* Media Upload Section */}
            <Box style={styles.card}>
              <Heading size="sm" style={styles.cardTitle}>
                📸 Post Media / Image Upload
              </Heading>

              {currentDisplayImage ? (
                <Box style={styles.imagePreviewBox}>
                  <Image source={{ uri: currentDisplayImage }} style={styles.uploadedImage} resizeMode="cover" />
                  <HStack space="xs" style={styles.imageActionOverlay}>
                    <TouchableOpacity style={styles.imgActionBtn} onPress={pickImage}>
                      <Feather name="refresh-cw" size={14} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imgActionBtn, { backgroundColor: "#dc2626" }]}
                      onPress={() => setImageUrl("")}
                    >
                      <Feather name="trash-2" size={14} color="#fff" />
                    </TouchableOpacity>
                  </HStack>
                </Box>
              ) : (
                <VStack space="xs" style={{ marginTop: 10 }}>
                  <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    <Feather name="upload-cloud" size={28} color="#0052d4" />
                    <Text style={styles.uploadText}>Choose Image from Gallery</Text>
                    <Text style={{ fontSize: 11, color: "#94a3b8" }}>Supports JPG, PNG, WEBP</Text>
                  </TouchableOpacity>

                  <Text style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginVertical: 4 }}>
                    — OR —
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="Paste Image URL (https://...)"
                    placeholderTextColor="#94a3b8"
                  />
                </VStack>
              )}
            </Box>

            {/* Platform Specific Content Tabs */}
            <Box style={styles.card}>
              <Heading size="sm" style={styles.cardTitle}>
                ✍ Post Content & Caption
              </Heading>

              {/* Sub-Tabs for Platform-Specific Customization */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabList}>
                <TouchableOpacity
                  style={[styles.subTabBtn, activePlatformTab === "general" && styles.subTabBtnActive]}
                  onPress={() => setActivePlatformTab("general")}
                >
                  <Text style={[styles.subTabText, activePlatformTab === "general" && styles.subTabTextActive]}>
                    General (All)
                  </Text>
                </TouchableOpacity>

                {selectedPlatforms.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.subTabBtn, activePlatformTab === p && styles.subTabBtnActive]}
                    onPress={() => setActivePlatformTab(p)}
                  >
                    <Text style={[styles.subTabText, activePlatformTab === p && styles.subTabTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Post title (optional)"
                  placeholderTextColor="#94a3b8"
                />
              </VStack>

              {/* Caption Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>
                  {activePlatformTab === "general" ? "Caption *" : `${activePlatformTab.toUpperCase()} Specific Caption`}
                </Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={
                    activePlatformTab === "general"
                      ? caption
                      : platformOverrides[activePlatformTab]?.caption ?? caption
                  }
                  onChangeText={(val) => {
                    if (activePlatformTab === "general") {
                      setCaption(val);
                    } else {
                      setPlatformOverrides((prev) => ({
                        ...prev,
                        [activePlatformTab]: { ...prev[activePlatformTab], caption: val, image_url: prev[activePlatformTab]?.image_url || "" },
                      }));
                    }
                  }}
                  placeholder="Write your post caption..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                />
              </VStack>

              {/* Hashtags Field */}
              <VStack style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Hashtags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={hashtagsInput}
                  onChangeText={setHashtagsInput}
                  placeholder="marketing, promotion, offer"
                  placeholderTextColor="#94a3b8"
                />
                {hashtagsInput.trim().length > 0 && (
                  <HStack space="xs" className="flex-wrap mt-2">
                    {hashtagsInput.split(",").map((tag, idx) => {
                      const trimmed = tag.trim().replace(/^#/, "");
                      if (!trimmed) return null;
                      return (
                        <Box key={idx} style={styles.tagChip}>
                          <Text style={styles.tagText}>#{trimmed}</Text>
                        </Box>
                      );
                    })}
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Publishing & Scheduling Section */}
            <Box style={styles.card}>
              <Heading size="sm" style={styles.cardTitle}>
                📅 Publishing & Scheduling
              </Heading>

              <HStack className="justify-between items-center mt-3">
                <VStack style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", color: "#0f172a", fontSize: 14 }}>Schedule for later</Text>
                  <Text style={{ fontSize: 12, color: "#64748b" }}>
                    Set automatic date & time for publishing
                  </Text>
                </VStack>
                <Switch
                  value={isScheduled}
                  onValueChange={(val) => {
                    setIsScheduled(val);
                    setPostStatus(val ? "scheduled" : "draft");
                  }}
                  trackColor={{ false: "#cbd5e1", true: "#0052d4" }}
                />
              </HStack>

              {isScheduled && (
                <VStack style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                  <Text style={styles.inputLabel}>Scheduled Date & Time</Text>
                  <HStack space="sm" className="mt-1">
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                      <Feather name="calendar" size={16} color="#0052d4" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>
                        {scheduledDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowTimePicker(true)}>
                      <Feather name="clock" size={16} color="#0052d4" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }}>
                        {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </TouchableOpacity>
                  </HStack>

                  {showDatePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_e, date) => {
                        setShowDatePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={scheduledDate}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_e, date) => {
                        setShowTimePicker(false);
                        if (date) setScheduledDate(date);
                      }}
                    />
                  )}
                </VStack>
              )}
            </Box>

            {/* Live Social Post Preview Card */}
            <Box style={styles.card}>
              <HStack className="justify-between items-center mb-3">
                <Heading size="sm" style={styles.cardTitle}>
                  👁 Live Social Feed Preview
                </Heading>
                <HStack space="xs">
                  {(["facebook", "instagram", "whatsapp"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.miniPrevTab, previewTab === p && styles.miniPrevTabActive]}
                      onPress={() => setPreviewTab(p)}
                    >
                      <FontAwesome
                        name={p === "facebook" ? "facebook-square" : p === "instagram" ? "instagram" : "whatsapp"}
                        size={14}
                        color={previewTab === p ? "#0052d4" : "#64748b"}
                      />
                    </TouchableOpacity>
                  ))}
                </HStack>
              </HStack>

              {/* Mock Social Post Container */}
              <Box style={styles.mockFeedCard}>
                {/* User Header */}
                <HStack space="sm" className="items-center mb-2">
                  <Box style={styles.mockAvatar}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>PB</Text>
                  </Box>
                  <VStack>
                    <Text style={{ fontWeight: "700", fontSize: 13, color: "#0f172a" }}>
                      Postbell Official
                    </Text>
                    <Text style={{ fontSize: 10, color: "#64748b" }}>Just now • 🌎</Text>
                  </VStack>
                </HStack>

                {/* Caption Text */}
                <Text style={{ fontSize: 13, color: "#1e293b", lineHeight: 18, marginBottom: 8 }}>
                  {currentDisplayCaption || "Your post caption will appear here..."}
                </Text>

                {/* Image */}
                {currentDisplayImage ? (
                  <Image source={{ uri: currentDisplayImage }} style={styles.mockPostImage} resizeMode="cover" />
                ) : (
                  <Box style={styles.mockImagePlaceholder}>
                    <Feather name="image" size={24} color="#cbd5e1" />
                  </Box>
                )}

                {/* Hashtags */}
                {hashtagsInput.trim().length > 0 && (
                  <Text style={{ fontSize: 12, color: "#2563eb", marginTop: 6, fontWeight: "600" }}>
                    {hashtagsInput
                      .split(",")
                      .map((t) => "#" + t.trim().replace(/^#/, ""))
                      .join(" ")}
                  </Text>
                )}
              </Box>
            </Box>

            {/* Save & Action Buttons Bar */}
            <VStack space="sm" style={{ marginTop: 8, marginBottom: 40 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#0052d4" }]}
                onPress={() => handleSavePost(isScheduled ? "scheduled" : "draft")}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {isEditing ? "Save Changes" : isScheduled ? "Schedule Post" : "Save as Draft"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#16a34a" }]}
                onPress={() => handleSavePost("published")}
                disabled={saving}
              >
                <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Publish Post Now</Text>
              </TouchableOpacity>
            </VStack>
          </VStack>
        )}
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0052d4",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerSaveBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSaveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  mainTabBar: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 4,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: "#ffffff",
  },
  mainTabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  mainTabLabelActive: {
    color: "#0052d4",
    fontWeight: "700",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  cardSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#0f172a",
    fontSize: 14,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "500",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  providerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  providerChipActive: {
    backgroundColor: "#e0f2fe",
    borderColor: "#0284c7",
  },
  providerChipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  providerChipTextActive: {
    color: "#0369a1",
    fontWeight: "700",
  },
  uploadBox: {
    height: 110,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    color: "#0052d4",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 6,
  },
  imagePreviewBox: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  uploadedImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  removeImgBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(220, 38, 38, 0.85)",
    padding: 8,
    borderRadius: 20,
  },
  imageActionOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  imgActionBtn: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    padding: 8,
    borderRadius: 20,
  },
  primaryBtn: {
    backgroundColor: "#0052d4",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  aiResultCard: {
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  applyBtn: {
    backgroundColor: "#0052d4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  tagChip: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  tagText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "600",
  },
  platformPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  platformPillActive: {
    backgroundColor: "#0052d4",
    borderColor: "#0052d4",
  },
  platformPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 6,
  },
  platformPillLabelActive: {
    color: "#fff",
  },
  accountBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subTabList: {
    paddingVertical: 8,
    gap: 6,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 4,
  },
  subTabBtnActive: {
    backgroundColor: "#0052d4",
    borderColor: "#0052d4",
  },
  subTabText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  subTabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
  },
  miniPrevTab: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    marginRight: 2,
  },
  miniPrevTabActive: {
    backgroundColor: "#dbeafe",
  },
  mockFeedCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mockAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0052d4",
    alignItems: "center",
    justifyContent: "center",
  },
  mockPostImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
  },
  mockImagePlaceholder: {
    height: 120,
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
