import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  Switch,
  Image,
  Platform,
  Dimensions,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import {
  listFestivalPosts,
  updateFestivalPostSelection,
  updateFestivalPost,
  createFestivalPost,
  sendFestivalNotifications,
  uploadFestivalImage,
  generateFestivalPostAI,
  getFestivalImageUrl,
  isPastDate,
  FestivalPost,
} from "./festival-auto-post.api";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";

const CATEGORY_SUGGESTIONS = [
  "Religious",
  "National",
  "Cultural",
  "Seasonal",
  "Regional",
  "International",
];

const EVENT_COLORS = [
  "#e74c3c",
  "#2eaa77",
  "#3b5bdb",
  "#4a4a4a",
  "#e67e22",
  "#8e44ad",
  "#2980b9",
  "#e84393",
  "#00897b",
  "#1565c0",
  "#6c5ce7",
  "#16a085",
];

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const getCategoryColor = (category?: string, fallback?: string) => {
  const key = (category || fallback || "general").toLowerCase().trim();
  return EVENT_COLORS[hashString(key) % EVENT_COLORS.length];
};

const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return "Tomorrow";
    if (absDays <= 7) return `In ${absDays} days`;
    if (absDays <= 30) return `In ${Math.ceil(absDays / 7)} weeks`;
    return `In ${Math.ceil(absDays / 30)} months`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const formatDisplayDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function FestivalPostCard({
  post,
  isSelected,
  expandedCaption,
  expandedHashtag,
  notificationLoading,
  onToggleCaption,
  onToggleHashtag,
  onSelectPost,
  onEditPost,
  onSendNotification,
  onViewImage,
}: {
  post: FestivalPost;
  isSelected: boolean;
  expandedCaption: boolean;
  expandedHashtag: boolean;
  notificationLoading: boolean;
  onToggleCaption: (expanded: boolean) => void;
  onToggleHashtag: (expanded: boolean) => void;
  onSelectPost: (checked: boolean) => void;
  onEditPost: () => void;
  onSendNotification: () => void;
  onViewImage: () => void;
}) {
  const catColor = getCategoryColor(post.category, post.name);
  const imageUrl = getFestivalImageUrl(post.image || post.image_url);
  const visibleHashtags = post.hashtags?.slice(
    0,
    expandedHashtag ? post.hashtags.length : 5,
  );
  const hasMoreHashtags = (post.hashtags?.length || 0) > 5 && !expandedHashtag;

  const openMenu = () => {
    Alert.alert(post.name, "Choose an action", [
      { text: "Edit post", onPress: onEditPost },
      { text: "Send notification", onPress: onSendNotification },
      { text: "View full image", onPress: onViewImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Box style={styles.igCard}>
      <HStack style={styles.igCardHeader} className="items-center">
        <Box
          style={[
            styles.igAvatar,
            {
              backgroundColor: `${catColor}20`,
              borderColor: isSelected ? "#193867" : `${catColor}40`,
            },
          ]}
        >
          <Text style={styles.igAvatarText}>
            {(post.name || "F").charAt(0).toUpperCase()}
          </Text>
        </Box>
        <VStack style={{ flex: 1, minWidth: 0 }}>
          <HStack className="items-center" space="xs">
            <TouchableOpacity onPress={onEditPost}>
              <Text style={styles.igCardName} numberOfLines={1}>
                {post.name}
              </Text>
            </TouchableOpacity>
            {post.isAutoPost && (
              <Box style={styles.autoPostChip}>
                <Text style={styles.autoPostChipText}>Auto Post</Text>
              </Box>
            )}
            {isSelected && (
              <Feather name="check-circle" size={14} color="#193867" />
            )}
          </HStack>
        </VStack>
        <TouchableOpacity onPress={openMenu} style={styles.igMenuBtn}>
          <Feather name="more-horizontal" size={18} color="#0f172a" />
        </TouchableOpacity>
      </HStack>

      <TouchableOpacity activeOpacity={0.95} onPress={onViewImage}>
        <Box style={styles.igImageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.igImage}
              resizeMode="cover"
            />
          ) : (
            <Box style={styles.igImagePlaceholder}>
              <Text style={{ fontSize: 32 }}>✨</Text>
            </Box>
          )}
        </Box>
      </TouchableOpacity>

      <HStack style={styles.igActions} className="items-center justify-between">
        <HStack className="items-center">
          <TouchableOpacity
            style={styles.igActionBtn}
            onPress={() => onSelectPost(!isSelected)}
          >
            <Feather
              name="heart"
              size={22}
              color={isSelected ? "#ef4444" : "#0f172a"}
              style={isSelected ? { opacity: 1 } : undefined}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.igActionBtn}
            onPress={onSendNotification}
            disabled={notificationLoading}
          >
            {notificationLoading ? (
              <ActivityIndicator size="small" color="#0f172a" />
            ) : (
              <Feather name="send" size={21} color="#0f172a" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.igActionBtn} onPress={onEditPost}>
            <Feather name="edit-2" size={21} color="#0f172a" />
          </TouchableOpacity>
        </HStack>
        <HStack className="items-center">
          <Switch
            value={isSelected}
            onValueChange={(val) => onSelectPost(val)}
            trackColor={{ false: "#e2e8f0", true: "#34c759" }}
            thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          <TouchableOpacity style={styles.igActionBtn} onPress={onViewImage}>
            <Feather name="bookmark" size={21} color="#0f172a" />
          </TouchableOpacity>
        </HStack>
      </HStack>

      <HStack style={styles.igChipRow} className="items-center flex-wrap">
        <Box
          style={[
            styles.statusChip,
            {
              backgroundColor: isSelected ? "#dcfce720" : "#f1f5f9",
            },
          ]}
        >
          <Text
            style={[
              styles.statusChipText,
              { color: isSelected ? "#16a34a" : "#94a3b8" },
            ]}
          >
            {isSelected ? "Active" : "Deactive"}
          </Text>
        </Box>
        <Box style={[styles.statusChip, { backgroundColor: `${catColor}18` }]}>
          <Text style={[styles.statusChipText, { color: catColor }]}>
            {post.category || "General"}
          </Text>
        </Box>
        {post.post_status && (
          <Box style={[styles.statusChip, { backgroundColor: "#dbeafe" }]}>
            <Text style={[styles.statusChipText, { color: "#2563eb" }]}>
              {post.post_status === "scheduled"
                ? "Scheduled"
                : post.post_status}
            </Text>
          </Box>
        )}
        {post.autoGenerate && (
          <Box style={[styles.statusChip, { backgroundColor: "#f3e8ff" }]}>
            <Text style={[styles.statusChipText, { color: "#9333ea" }]}>
              AI Auto
            </Text>
          </Box>
        )}
        <Text style={styles.igDateText}>{formatDisplayDate(post.date)}</Text>
      </HStack>

      <Box style={styles.igCaptionWrap}>
        {post.caption ? (
          <Box style={{ marginBottom: 4 }}>
            <Text style={styles.igCaption} numberOfLines={expandedCaption ? undefined : 2}>
              <Text style={styles.igCaptionName}>{post.name} </Text>
              {post.caption}
            </Text>
            {!expandedCaption && (post.caption.length || 0) > 80 && (
              <TouchableOpacity onPress={() => onToggleCaption(true)}>
                <Text style={styles.igMoreText}>more</Text>
              </TouchableOpacity>
            )}
            {expandedCaption && (
              <TouchableOpacity onPress={() => onToggleCaption(false)}>
                <Text style={styles.igMoreText}>less</Text>
              </TouchableOpacity>
            )}
          </Box>
        ) : null}

        {visibleHashtags && visibleHashtags.length > 0 && (
          <Text style={styles.igHashtags}>
            {visibleHashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}
            {hasMoreHashtags && (
              <Text style={styles.igMoreText} onPress={() => onToggleHashtag(true)}>
                {" "}
                +{(post.hashtags?.length || 0) - 5} more
              </Text>
            )}
            {expandedHashtag && (post.hashtags?.length || 0) > 5 && (
              <Text style={styles.igMoreText} onPress={() => onToggleHashtag(false)}>
                {" "}
                show less
              </Text>
            )}
          </Text>
        )}

        <Text style={styles.igTimeAgo}>{getTimeAgo(post.date)}</Text>
      </Box>
    </Box>
  );
}

export default function FestivalAutoPostScreen() {
  const [posts, setPosts] = useState<FestivalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [notificationLoadingId, setNotificationLoadingId] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [expandedHashtags, setExpandedHashtags] = useState<Record<string, boolean>>({});
  const [imageViewer, setImageViewer] = useState<{ open: boolean; src: string; alt: string }>({
    open: false,
    src: "",
    alt: "",
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<FestivalPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedFestival, setSelectedFestival] = useState(true);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date | null>(null);
  const [generatingType, setGeneratingType] = useState<"gemini" | "openai" | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fetchFestivalPostsList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "10",
          currentMonth: "true",
        });

        if (search.trim()) {
          queryParams.append("search", search.trim());
        }

        const res = await listFestivalPosts(queryParams.toString());
        const items = res?.data || [];

        if (reset) {
          setPosts(items);
        } else {
          setPosts((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load festival posts.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchFestivalPostsList(1, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFestivalPostsList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFestivalPostsList(page + 1, false);
  };

  const getPostId = (post: FestivalPost) => post._id || post.id || "";

  const handleToggleSelection = async (item: FestivalPost, nextVal: boolean) => {
    const id = getPostId(item);
    try {
      await updateFestivalPostSelection(id, nextVal);
      setPosts((prev) =>
        prev.map((p) =>
          getPostId(p) === id ? { ...p, selectedFestival: nextVal } : p,
        ),
      );
      Alert.alert(
        "Success",
        `Festival automated posting ${nextVal ? "enabled" : "disabled"}.`,
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle festival selection.");
    }
  };

  const confirmToggleSelection = (item: FestivalPost, nextVal: boolean) => {
    Alert.alert(
      nextVal ? "Active Post" : "Deactive Post",
      `Are you sure you want to ${nextVal ? "active" : "deactive"} the festival post "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextVal ? "Active Post" : "Deactive Post",
          onPress: () => handleToggleSelection(item, nextVal),
        },
      ],
    );
  };

  const handleSendNotification = async (item: FestivalPost) => {
    try {
      setNotificationLoadingId(item.name);
      await sendFestivalNotifications(item.name);
      Alert.alert(
        "Notifications Sent",
        `Successfully triggered notifications for ${item.name}!`,
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to trigger notifications.");
    } finally {
      setNotificationLoadingId(null);
    }
  };

  const resetForm = () => {
    setName("");
    setDate("");
    setCategory("");
    setStatus("active");
    setSelectedFestival(true);
    setAutoGenerate(false);
    setCaption("");
    setHashtags([]);
    setHashtagInput("");
    setImageUrl("");
    setLocalImageUri(null);
    setImageError(null);
    setTouched({});
    setGeneratingType(null);
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    resetForm();
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    setDatePickerValue(today);
    setModalVisible(true);
  };

  const handleOpenEdit = (post: FestivalPost) => {
    setEditingPost(post);
    setName(post.name || "");
    setDate(post.date || "");
    setCategory(post.category || "");
    setStatus(post.status || "active");
    setSelectedFestival(post.selectedFestival ?? false);
    setAutoGenerate(post.autoGenerate ?? false);
    setCaption(post.caption || "");
    setHashtags(post.hashtags ? [...post.hashtags] : []);
    setHashtagInput("");
    setImageUrl(post.image || post.image_url || "");
    setLocalImageUri(null);
    setImageError(null);
    setTouched({});
    setDatePickerValue(post.date ? new Date(post.date) : new Date());
    setModalVisible(true);
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      if (isPastDate(selectedDate)) {
        Alert.alert("Validation Error", "Date cannot be in the past");
        return;
      }
      const isoDate = selectedDate.toISOString().split("T")[0];
      setDate(isoDate);
      setDatePickerValue(selectedDate);
      setTouched((prev) => ({ ...prev, date: true }));
    }
  };

  const openDatePicker = () => {
    const currentDate = date ? new Date(date) : new Date();
    setDatePickerValue(isNaN(currentDate.getTime()) ? new Date() : currentDate);
    setShowDatePicker(true);
  };

  const processHashtags = (input: string) => {
    if (!input.trim()) return;
    const hashtagRegex = /#?(\w+)/g;
    const matches = [...input.matchAll(hashtagRegex)];
    const newTags = matches
      .map((match) => match[1].trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    if (newTags.length === 0) return;
    setHashtags((prev) => {
      const combined = [...prev];
      newTags.forEach((tag) => {
        if (!combined.includes(tag)) combined.push(tag);
      });
      return combined;
    });
    setHashtagInput("");
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handleAddHashtag = () => {
    const value = hashtagInput.trim().replace(/^#+/, "");
    if (!value) return;
    if (hashtags.includes(value)) {
      setHashtagInput("");
      return;
    }
    setHashtags((prev) => [...prev, value]);
    setHashtagInput("");
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
    setTouched((prev) => ({ ...prev, hashtags: true }));
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setImageError("Image must be less than 5 MB");
        return;
      }
      setLocalImageUri(asset.uri);
      setImageError(null);
      setTouched((prev) => ({ ...prev, image: true }));
    }
  };

  const handleGenerateAI = async (provider: "gemini" | "openai") => {
    if (!name.trim() || !category.trim()) {
      Alert.alert("Validation Error", "Festival name and category are required for AI generation.");
      return;
    }
    setGeneratingType(provider);
    try {
      const prompt = `Generate a festival post for ${name.trim()} (${category.trim()})`;
      const res = await generateFestivalPostAI(provider, {
        prompt,
        referenceImageUri: localImageUri || undefined,
      });
      const aiPost = res?.data?.posts?.[0];
      if (aiPost) {
        if (aiPost.caption) setCaption(aiPost.caption);
        if (aiPost.hashtags) {
          setHashtags(
            (aiPost.hashtags || []).map((tag: string) =>
              tag.replace(/^#/, "").trim(),
            ),
          );
        }
        const aiImage = aiPost.image_url || aiPost.image;
        if (aiImage) {
          setImageUrl(aiImage);
          setLocalImageUri(null);
        }
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "AI generation failed.");
    } finally {
      setGeneratingType(null);
    }
  };

  const hasName = name.trim().length > 0;
  const hasDate = date.trim().length > 0;
  const isDateInPast = hasDate && isPastDate(date);
  const hasCategory = category.trim().length > 0;
  const hasCaption = caption.trim().length > 0;
  const hasHashtags = hashtags.length > 0;
  const hasImage = Boolean(localImageUri || imageUrl);

  const handleSave = async () => {
    setTouched({
      name: true,
      date: true,
      category: true,
      caption: true,
      hashtags: true,
      image: true,
    });

    if (!hasName || !hasDate || isDateInPast || !hasCategory || !hasCaption || !hasHashtags || !hasImage) {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields: name, date, category, caption, hashtags, and image.",
      );
      return;
    }

    try {
      setSaving(true);
      let finalImageUrl = imageUrl;

      if (localImageUri) {
        const uploadRes = await uploadFestivalImage(localImageUri);
        if (uploadRes.data?.url) {
          finalImageUrl = uploadRes.data.url;
        } else {
          throw new Error("Failed to upload image");
        }
      }

      const payload: Partial<FestivalPost> = {
        name: name.trim(),
        date,
        category: category.trim(),
        status,
        selectedFestival,
        autoGenerate,
        caption: caption.trim(),
        hashtags,
        image: finalImageUrl,
      };

      if (editingPost) {
        await updateFestivalPost(getPostId(editingPost), payload);
        Alert.alert("Success", "Festival event updated!");
      } else {
        await createFestivalPost(payload);
        Alert.alert("Success", "Festival event created!");
      }

      setModalVisible(false);
      resetForm();
      fetchFestivalPostsList(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save festival configuration.");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: FestivalPost }) => {
    const postId = getPostId(item);
    return (
      <FestivalPostCard
        post={item}
        isSelected={Boolean(item.selectedFestival)}
        expandedCaption={expandedCaptions[postId] || false}
        expandedHashtag={expandedHashtags[postId] || false}
        notificationLoading={notificationLoadingId === item.name}
        onToggleCaption={(expanded) =>
          setExpandedCaptions((prev) => ({ ...prev, [postId]: expanded }))
        }
        onToggleHashtag={(expanded) =>
          setExpandedHashtags((prev) => ({ ...prev, [postId]: expanded }))
        }
        onSelectPost={(checked) => confirmToggleSelection(item, checked)}
        onEditPost={() => handleOpenEdit(item)}
        onSendNotification={() => handleSendNotification(item)}
        onViewImage={() =>
          setImageViewer({
            open: true,
            src: getFestivalImageUrl(item.image || item.image_url) || "",
            alt: item.name || "Festival Image",
          })
        }
      />
    );
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const filteredPosts = posts.filter((item) => {
    if (!item.date) return activeTab === "upcoming";
    return activeTab === "upcoming" ? item.date >= todayStr : item.date < todayStr;
  });

  const previewImageUri =
    localImageUri ||
    (imageUrl ? getFestivalImageUrl(imageUrl) : "") ||
    null;

  const isCreate = !editingPost;
  const headerTitle = name.trim() || (isCreate ? "Untitled event" : editingPost?.name || "Untitled festival");

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#fff" />
              <Text className="text-white text-sm font-semibold ml-1">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff", fontWeight: "700", marginTop: 4 }}>
            Festival Auto Posts
          </Heading>
        </Box>
      </Box>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Banner Card */}
        <LinearGradient colors={["#0052d4", "#0040b0"]} style={styles.bannerCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <VStack style={{ flex: 1, marginRight: 12 }} space="xs">
            <Text style={styles.bannerTitle}>
              Let PostBell handle your festival wishes and greetings automatically!
            </Text>
            <Text style={styles.bannerSubtitle}>
              Choose festivals and we'll post for you at the best times.
            </Text>
          </VStack>
          <Box style={styles.bannerGraphicContainer}>
            <Feather name="calendar" size={30} color="#0052d4" />
            <Text style={{ fontSize: 9, color: "#0052d4", fontWeight: "800", marginTop: 2 }}>AUTO</Text>
          </Box>
        </LinearGradient>

        {/* Tabs */}
        <HStack style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "upcoming" && styles.tabButtonActive]}
            onPress={() => setActiveTab("upcoming")}
          >
            <Text style={[styles.tabButtonText, activeTab === "upcoming" && styles.tabButtonTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "completed" && styles.tabButtonActive]}
            onPress={() => setActiveTab("completed")}
          >
            <Text style={[styles.tabButtonText, activeTab === "completed" && styles.tabButtonTextActive]}>
              Completed
            </Text>
          </TouchableOpacity>
        </HStack>

        {/* List Content */}
        {loading ? (
          <Box className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#0052d4" />
          </Box>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={filteredPosts}
            keyExtractor={(item) => getPostId(item) || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0052d4" />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={
              <Box className="items-center justify-center py-20">
                <Text className="text-typography-400 text-base">No festival posts found</Text>
              </Box>
            }
            ListFooterComponent={
              loadingMore ? <ActivityIndicator size="small" color="#0052d4" style={{ marginVertical: 20 }} /> : null
            }
            renderItem={renderItem}
          />
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewer.open}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewer({ open: false, src: "", alt: "" })}
      >
        <TouchableOpacity
          style={styles.imageViewerOverlay}
          activeOpacity={1}
          onPress={() => setImageViewer({ open: false, src: "", alt: "" })}
        >
          {imageViewer.src ? (
            <Image
              source={{ uri: imageViewer.src }}
              style={styles.imageViewerImg}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => !saving && setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Box style={styles.modalHeader}>
              <HStack className="items-center" space="md">
                <Box style={styles.modalHeaderAvatar}>
                  <Text style={styles.modalHeaderAvatarText}>
                    {headerTitle.charAt(0).toUpperCase()}
                  </Text>
                </Box>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderKicker}>
                    {isCreate ? "New Festival Event" : "Edit Festival"}
                  </Text>
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    {headerTitle}
                  </Text>
                  <HStack className="items-center flex-wrap" space="xs">
                    <Feather name="calendar" size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.modalHeaderMeta}>
                      {date ? formatDisplayDate(date) : "No date set"}
                    </Text>
                    {category ? (
                      <>
                        <Text style={styles.modalHeaderDot}>•</Text>
                        <Text style={styles.modalHeaderMeta}>{category}</Text>
                      </>
                    ) : null}
                    {selectedFestival && (
                      <Box style={styles.modalSelectedChip}>
                        <Text style={styles.modalSelectedChipText}>Selected</Text>
                      </Box>
                    )}
                  </HStack>
                </VStack>
                <TouchableOpacity
                  onPress={() => !saving && setModalVisible(false)}
                  disabled={saving}
                  style={styles.modalCloseBtn}
                >
                  <Feather name="x" size={20} color="#fff" />
                </TouchableOpacity>
              </HStack>
            </Box>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get("window").height * 0.55 }}>
              <VStack space="md" style={{ padding: 16 }}>
                <VStack space="xs">
                  <Text style={styles.label}>Festival Name *</Text>
                  <TextInput
                    style={[styles.modalInput, touched.name && !hasName && styles.modalInputError]}
                    value={name}
                    onChangeText={setName}
                    onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                    placeholder="e.g. Diwali, Eid, Christmas..."
                  />
                  {touched.name && !hasName && (
                    <Text style={styles.errorText}>Festival name is required</Text>
                  )}
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Date *</Text>
                    <TouchableOpacity onPress={openDatePicker}>
                      <Box style={[styles.modalInput, styles.datePickerBox, touched.date && (!hasDate || isDateInPast) && styles.modalInputError]}>
                        <Text style={{ color: date ? "#0f172a" : "#94a3b8" }}>
                          {date || "Select date"}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={datePickerValue || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                      />
                    )}
                    {touched.date && isDateInPast && (
                      <Text style={styles.errorText}>Date cannot be in the past</Text>
                    )}
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Category *</Text>
                    <TextInput
                      style={[styles.modalInput, touched.category && !hasCategory && styles.modalInputError]}
                      value={category}
                      onChangeText={setCategory}
                      onBlur={() => setTouched((p) => ({ ...p, category: true }))}
                      placeholder="e.g. Religious, National"
                    />
                  </VStack>
                </HStack>

                <HStack style={styles.categoryChips} className="flex-wrap">
                  {CATEGORY_SUGGESTIONS.map((suggestion) => {
                    const isActive = category.toLowerCase() === suggestion.toLowerCase();
                    const chipColor = getCategoryColor(suggestion);
                    return (
                      <TouchableOpacity
                        key={suggestion}
                        onPress={() => {
                          setCategory(suggestion);
                          setTouched((p) => ({ ...p, category: true }));
                        }}
                        style={[
                          styles.categoryChip,
                          isActive
                            ? { backgroundColor: chipColor, borderColor: chipColor }
                            : { backgroundColor: "transparent", borderColor: "#e2e8f0" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isActive ? "#fff" : "#64748b" },
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </HStack>
                {touched.category && !hasCategory && (
                  <Text style={styles.errorText}>Please select or type an event category</Text>
                )}

                <Box
                  style={[
                    styles.imageSection,
                    touched.image && !hasImage && styles.imageSectionError,
                  ]}
                >
                  <Text style={[styles.label, { marginBottom: 10 }]}>
                    Post Image & AI Generation *
                  </Text>
                  <HStack style={styles.aiBtnRow} className="flex-wrap">
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} disabled={saving || generatingType !== null}>
                      <Feather name="image" size={14} color="#0052d4" />
                      <Text style={styles.uploadBtnText}>Upload Image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.aiBtn, { backgroundColor: "#0284c7" }]}
                      onPress={() => handleGenerateAI("gemini")}
                      disabled={saving || generatingType !== null || !hasName || !hasCategory}
                    >
                      {generatingType === "gemini" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="zap" size={14} color="#fff" />
                          <Text style={styles.aiBtnText}>Generate with Gemini</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.aiBtn, { backgroundColor: "#193867" }]}
                      onPress={() => handleGenerateAI("openai")}
                      disabled={saving || generatingType !== null || !hasName || !hasCategory}
                    >
                      {generatingType === "openai" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="zap" size={14} color="#fff" />
                          <Text style={styles.aiBtnText}>Generate with OpenAI</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </HStack>

                  <VStack space="xs" style={{ marginTop: 10 }}>
                    <Text style={styles.label}>Image URL</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={imageUrl}
                      onChangeText={(val) => {
                        setImageUrl(val);
                        setTouched((p) => ({ ...p, image: true }));
                      }}
                      autoCapitalize="none"
                      placeholder="https://example.com/diwali.jpg"
                    />
                  </VStack>

                  {imageError && <Text style={styles.errorText}>{imageError}</Text>}
                  {touched.image && !hasImage && !imageError && (
                    <Text style={styles.errorText}>
                      An operational image asset or preview is required.
                    </Text>
                  )}

                  {previewImageUri && (
                    <TouchableOpacity
                      style={styles.imagePreviewWrap}
                      onPress={() =>
                        setImageViewer({
                          open: true,
                          src: previewImageUri,
                          alt: name || "Preview",
                        })
                      }
                    >
                      <Image
                        source={{ uri: previewImageUri }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </Box>

                <VStack space="xs">
                  <Text style={styles.label}>Caption *</Text>
                  <TextInput
                    style={[styles.modalInput, styles.captionInput, touched.caption && !hasCaption && styles.modalInputError]}
                    value={caption}
                    onChangeText={setCaption}
                    onBlur={() => setTouched((p) => ({ ...p, caption: true }))}
                    multiline
                    placeholder="Write the post caption..."
                  />
                  <Text style={styles.helperText}>{caption.length} characters</Text>
                  {touched.caption && !hasCaption && (
                    <Text style={styles.errorText}>Caption content is required</Text>
                  )}
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Hashtags *</Text>
                  <HStack space="sm" className="items-center">
                    <TextInput
                      style={[styles.modalInput, { flex: 1 }, touched.hashtags && !hasHashtags && styles.modalInputError]}
                      value={hashtagInput}
                      onChangeText={setHashtagInput}
                      onBlur={() => {
                        if (hashtagInput.trim()) processHashtags(hashtagInput);
                        setTouched((p) => ({ ...p, hashtags: true }));
                      }}
                      onSubmitEditing={handleAddHashtag}
                      placeholder="Paste or type hashtags (e.g. #Diwali #FestivalOfLights)"
                    />
                    <TouchableOpacity style={styles.addHashtagBtn} onPress={handleAddHashtag} disabled={!hashtagInput.trim()}>
                      <Text style={styles.addHashtagBtnText}>Add</Text>
                    </TouchableOpacity>
                  </HStack>
                  {hashtags.length > 0 && (
                    <HStack style={styles.hashtagChips} className="flex-wrap">
                      {hashtags.map((tag) => (
                        <TouchableOpacity
                          key={tag}
                          style={styles.hashtagChip}
                          onPress={() => handleRemoveHashtag(tag)}
                        >
                          <Text style={styles.hashtagChipText}>#{tag.replace(/^#/, "")}</Text>
                          <Feather name="x" size={12} color="#193867" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      ))}
                    </HStack>
                  )}
                  {touched.hashtags && !hasHashtags && (
                    <Text style={styles.errorText}>At least one hashtag is required</Text>
                  )}
                </VStack>

                <Box style={styles.switchCard}>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.switchCardTitle}>Selected for notifications</Text>
                    <Text style={styles.switchCardSub}>
                      Customers will be notified for this festival
                    </Text>
                  </VStack>
                  <Switch
                    value={selectedFestival}
                    onValueChange={setSelectedFestival}
                    trackColor={{ false: "#e2e8f0", true: "#34c759" }}
                    thumbColor={Platform.OS === "android" ? "#ffffff" : undefined}
                  />
                </Box>

                <Box style={styles.switchCard}>
                  <VStack style={{ flex: 1 }}>
                    <Text style={styles.switchCardTitle}>Auto-generate posts</Text>
                    <Box style={[styles.yesNoChip, autoGenerate ? styles.yesChip : styles.noChip]}>
                      <Text style={[styles.yesNoChipText, autoGenerate ? styles.yesChipText : styles.noChipText]}>
                        {autoGenerate ? "YES" : "NO"}
                      </Text>
                    </Box>
                  </VStack>
                  <Switch value={autoGenerate} onValueChange={setAutoGenerate} />
                </Box>

                {editingPost && (
                  <TouchableOpacity style={styles.modalNotifyBtn} onPress={() => handleSendNotification(editingPost)}>
                    <Text style={styles.modalNotifyBtnText}>🔔 Trigger Immediate Test Post</Text>
                  </TouchableOpacity>
                )}

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === "active" && styles.statusToggleBtnActive]}
                      onPress={() => setStatus("active")}
                    >
                      <Text style={[styles.statusToggleText, status === "active" && styles.statusToggleTextActive]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === "inactive" && styles.statusToggleBtnActiveDanger]}
                      onPress={() => setStatus("inactive")}
                    >
                      <Text style={[styles.statusToggleText, status === "inactive" && styles.statusToggleTextActiveDanger]}>Inactive</Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" style={styles.modalFooter}>
              <Button
                style={{ flex: 1, backgroundColor: "#0052d4", borderRadius: 12 }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ButtonText style={{ color: "white" }}>{isCreate ? "Create Event" : "Save Changes"}</ButtonText>
                )}
              </Button>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => !saving && setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0052d4",
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  addBtn: {
    padding: 6,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0052d4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 18,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 4,
  },
  bannerGraphicContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabContainer: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    padding: 3,
    flexDirection: "row",
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  tabButtonActive: {
    backgroundColor: "#0052d4",
  },
  tabButtonText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  igCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  igCardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  igAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginRight: 8,
  },
  igAvatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#193867",
  },
  igCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    maxWidth: 180,
  },
  autoPostChip: {
    backgroundColor: "#193867",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  autoPostChipText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  igMenuBtn: {
    padding: 4,
  },
  igImageWrap: {
    width: "100%",
    aspectRatio: 4 / 5,
    backgroundColor: "#f1f5f9",
  },
  igImage: {
    width: "100%",
    height: "100%",
  },
  igImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    aspectRatio: 4 / 5,
  },
  igActions: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  igActionBtn: {
    padding: 8,
  },
  igChipRow: {
    paddingHorizontal: 10,
    paddingTop: 4,
    gap: 4,
  },
  statusChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  igDateText: {
    fontSize: 10,
    color: "#94a3b8",
    marginLeft: "auto",
  },
  igCaptionWrap: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 12,
  },
  igCaption: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#0f172a",
  },
  igCaptionName: {
    fontWeight: "700",
  },
  igMoreText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  igHashtags: {
    fontSize: 12,
    color: "#0052d4",
    lineHeight: 18,
  },
  igTimeAgo: {
    fontSize: 10,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginTop: 4,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  imageViewerImg: {
    width: "100%",
    height: "80%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: "#0b5cf8",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalHeaderAvatar: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  modalHeaderAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 20,
  },
  modalHeaderKicker: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  modalHeaderTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 22,
  },
  modalHeaderMeta: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 11,
    fontWeight: "500",
  },
  modalHeaderDot: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
  },
  modalSelectedChip: {
    backgroundColor: "rgba(34,197,94,0.25)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.5)",
    marginLeft: 4,
  },
  modalSelectedChipText: {
    color: "#bbf7d0",
    fontSize: 10,
    fontWeight: "600",
  },
  modalCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#fafafa",
  },
  modalInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  captionInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  datePickerBox: {
    justifyContent: "center",
    minHeight: 44,
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "500",
    marginTop: 2,
  },
  helperText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  categoryChips: {
    gap: 6,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  imageSection: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  imageSectionError: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.02)",
  },
  aiBtnRow: {
    gap: 8,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#0052d4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  uploadBtnText: {
    color: "#0052d4",
    fontSize: 12,
    fontWeight: "600",
  },
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  aiBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  imagePreviewWrap: {
    marginTop: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  addHashtagBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    height: 44,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addHashtagBtnText: {
    color: "#193867",
    fontWeight: "700",
    fontSize: 13,
  },
  hashtagChips: {
    gap: 6,
    marginTop: 8,
  },
  hashtagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(25,56,103,0.08)",
    borderWidth: 1,
    borderColor: "rgba(25,56,103,0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  hashtagChipText: {
    color: "#193867",
    fontSize: 11.5,
    fontWeight: "600",
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
  },
  switchCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  switchCardSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  yesNoChip: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  yesChip: {
    borderColor: "#86efac",
    backgroundColor: "#dcfce7",
  },
  noChip: {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  yesNoChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  yesChipText: {
    color: "#15803d",
  },
  noChipText: {
    color: "#64748b",
  },
  modalNotifyBtn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    marginVertical: 4,
  },
  modalNotifyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#d97706",
  },
  statusToggleBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  statusToggleBtnActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
  },
  statusToggleBtnActiveDanger: {
    backgroundColor: "#fee2e2",
    borderColor: "#fca5a5",
  },
  statusToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  statusToggleTextActive: {
    color: "#15803d",
  },
  statusToggleTextActiveDanger: {
    color: "#dc2626",
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    minHeight: 44,
  },
  cancelBtnText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
});
