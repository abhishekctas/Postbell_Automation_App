import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/context/AuthContext";
import { listPosts, createPost, updatePost, deletePost, publishPostNow, Post } from "./posts.api";
import { Feather, FontAwesome } from "@expo/vector-icons";

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: "#eff6ff", color: "#3b82f6", label: "Published" },
  scheduled: { bg: "#f0fdf4", color: "#22c55e", label: "Scheduled" },
  draft: { bg: "#f1f5f9", color: "#64748b", label: "Draft" },
  failed: { bg: "#fef2f2", color: "#ef4444", label: "Failed" },
  partial: { bg: "#fef3c7", color: "#d97706", label: "Partial" },
};

function StatusBadge({ status }: { status?: string }) {
  const normStatus = (status ?? "draft").toLowerCase();
  const meta = STATUS_META[normStatus] ?? STATUS_META.draft;
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

// ── Filter tab ────────────────────────────────────────────────────────────────
const FILTERS = ["all", "scheduled", "published", "failed", "draft"];

function FilterTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (f: string) => void;
}) {
  return (
    <FlatList
      horizontal
      data={FILTERS}
      keyExtractor={(f) => f}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterList}
      renderItem={({ item }) => {
        const isActive = active === item;
        const displayLabel = item === "draft" ? "Drafts" : item.charAt(0).toUpperCase() + item.slice(1);
        return (
          <TouchableOpacity
            onPress={() => onChange(item)}
            style={[styles.filterBtn, isActive && styles.filterBtnActive]}
          >
            <Text
              style={[
                styles.filterText,
                isActive && styles.filterTextActive,
              ]}
            >
              {displayLabel}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onOpenOptions,
}: {
  post: Post;
  onOpenOptions: () => void;
}) {
  const platforms = post.selectedNetworks ?? [];
  const previewImg = post.image_url;

  return (
    <Box style={styles.postCard}>
      <HStack space="md" className="items-center" style={{ flex: 1 }}>
        {/* Left: Thumbnail */}
        {previewImg ? (
          <Image source={{ uri: previewImg }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={["#e0f2fe", "#bae6fd"]} style={styles.cardImagePlaceholder}>
            <Text style={{ fontSize: 20 }}>📝</Text>
          </LinearGradient>
        )}

        {/* Middle: Details */}
        <VStack space="xs" style={{ flex: 1, justifyContent: "center" }}>
          <Text
            className="text-typography-900 font-bold text-sm"
            numberOfLines={2}
            style={styles.cardTitle}
          >
            {post.title || post.caption || "Untitled Post"}
          </Text>
          {post.createdAt && (
            <Text style={styles.cardDate}>
              {(() => {
                const d = new Date(post.createdAt);
                if (isNaN(d.getTime())) return post.createdAt;
                return d.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }) + " • " + d.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
              })()}
            </Text>
          )}

          {/* Social Platforms */}
          {platforms.length > 0 && (
            <HStack space="xs" className="mt-1 items-center">
              {platforms.map((p, idx) => {
                const name = p.toLowerCase();
                let iconName = "";
                let iconColor = "#64748b";
                if (name.includes("facebook")) { iconName = "facebook-square"; iconColor = "#1877f2"; }
                else if (name.includes("instagram")) { iconName = "instagram"; iconColor = "#e1306c"; }
                else if (name.includes("whatsapp")) { iconName = "whatsapp"; iconColor = "#25d366"; }
                else if (name.includes("twitter") || name.includes("x")) { iconName = "twitter"; iconColor = "#1da1f2"; }
                else if (name.includes("linkedin")) { iconName = "linkedin"; iconColor = "#0a66c2"; }
                else if (name.includes("youtube")) { iconName = "youtube-play"; iconColor = "#ff0000"; }
                if (!iconName) return null;
                return <FontAwesome key={idx} name={iconName as any} size={15} color={iconColor} style={{ marginRight: 4 }} />;
              })}
            </HStack>
          )}
        </VStack>

        {/* Right: Actions and Status */}
        <VStack style={{ alignItems: "flex-end", height: "100%", justifyContent: "space-between", minHeight: 70 }}>
          <TouchableOpacity onPress={onOpenOptions} style={styles.moreBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="more-horizontal" size={20} color="#64748b" />
          </TouchableOpacity>
          <StatusBadge status={post.post_status} />
        </VStack>
      </HStack>
    </Box>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [actionPost, setActionPost] = useState<Post | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCaption, setEditorCaption] = useState("");
  const [editorHashtags, setEditorHashtags] = useState("");
  const [editorStatus, setEditorStatus] = useState("draft");
  const [editorDate, setEditorDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date | null>(null);

  const fetchPosts = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const status = filter === "all" ? undefined : filter;
        const loginType = user?.loginType || "user";
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "15",
          loginType,
        });
        if (status) {
          queryParams.append("columnFilters", JSON.stringify({ post_status: status }));
        }
        const res = (await listPosts(queryParams.toString())) as any;
        const rawItems = res?.data || (Array.isArray(res) ? res : (res?.results || []));
        const items: Post[] = Array.isArray(rawItems) ? rawItems : [];
        if (reset) {
          setPosts(items);
        } else {
          setPosts((prev) => [...prev, ...items]);
        }
        const lastPage = res?.pagination?.lastPage ?? 1;
        setHasMore(pg < lastPage);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load posts.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, user],
  );

  useEffect(() => {
    fetchPosts(1, true);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPosts(page + 1, false);
  };

  const handleDelete = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
          } catch {
            Alert.alert("Error", "Failed to delete post.");
          }
        },
      },
    ]);
  };

  const handleOpenDetails = (post: Post) => {
    setSelectedPost(post);
    setDetailModalVisible(true);
  };

  const handleOpenEditor = (post?: Post) => {
    if (post) {
      setSelectedPost(post);
      setEditorTitle(post.title || post.caption || "");
      setEditorCaption(post.caption || "");
      setEditorHashtags((post.hashtags || []).join(", "));
      setEditorStatus(post.post_status || "draft");
      setEditorDate(post.scheduled_at || post.publishedAt || post.createdAt || "");
    } else {
      setSelectedPost(null);
      setEditorTitle("");
      setEditorCaption("");
      setEditorHashtags("");
      setEditorStatus("draft");
      setEditorDate("");
    }
    setEditorVisible(true);
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString();
      setEditorDate(isoDate);
      setDatePickerValue(selectedDate);
    }
  };

  const handleSavePost = async () => {
    try {
      const payload = {
        title: editorTitle,
        caption: editorCaption,
        hashtags: editorHashtags
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean),
        post_status: editorStatus,
        scheduled_at: editorDate || undefined,
      };

      const id = selectedPost?._id || selectedPost?.id;
      if (id) {
        await updatePost(id, payload);
        Alert.alert("Success", "Post updated successfully.");
      } else {
        await createPost(payload);
        Alert.alert("Success", "Post created successfully.");
      }

      setEditorVisible(false);
      setDetailModalVisible(false);
      await fetchPosts(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save post.");
    }
  };

  const handlePublish = async (postId: string) => {
    try {
      await publishPostNow(postId);
      setPosts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === postId ? { ...p, post_status: "published" } : p,
        ),
      );
      Alert.alert("Success", "Post published successfully!");
    } catch {
      Alert.alert("Error", "Failed to publish post.");
    }
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header}>
        <HStack className="justify-between items-center px-5 pt-14 pb-4">
          <Heading size="xl" style={{ color: "#fff", fontWeight: "700" }}>
            Posts
          </Heading>
          <HStack space="md" className="items-center">
            <TouchableOpacity onPress={() => Alert.alert("Filter", "Filter click triggered")}>
              <Feather name="filter" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("Search", "Search click triggered")}>
              <Feather name="search" size={22} color="#fff" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>

      {/* Filters */}
      <FilterTabs active={filter} onChange={(f) => setFilter(f)} />

      {/* List */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0052d4" />
        </Box>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p._id || p.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0052d4"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">
                No posts found
              </Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#0052d4"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onOpenOptions={() => {
                setActionPost(item);
                setOptionsModalVisible(true);
              }}
            />
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabBtn}
        onPress={() => handleOpenEditor()}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Post Details Modal */}
      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <HStack className="justify-between items-center mb-4">
              <Heading size="md" style={{ color: "#0f172a" }}>Post Details</Heading>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={{ color: "#0052d4", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </HStack>
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space="sm">
                <Text style={styles.detailLabel}>Title</Text>
                <Text style={styles.detailValue}>{selectedPost?.title || selectedPost?.caption || "Untitled Post"}</Text>
                <Text style={styles.detailLabel}>Caption</Text>
                <Text style={styles.detailValue}>{selectedPost?.caption || "No caption available"}</Text>
                <Text style={styles.detailLabel}>Platforms</Text>
                <Text style={styles.detailValue}>{(selectedPost?.selectedNetworks || []).join(", ") || "No platform selected"}</Text>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{selectedPost?.post_status || "draft"}</Text>
                <Text style={styles.detailLabel}>Scheduled / Published</Text>
                <Text style={styles.detailValue}>{selectedPost?.scheduled_at || selectedPost?.publishedAt || selectedPost?.createdAt || "—"}</Text>
              </VStack>
            </ScrollView>
            <HStack space="sm" className="mt-4">
              <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={() => { setDetailModalVisible(false); handleOpenEditor(selectedPost || undefined); }}>
                <Text style={styles.actionBtnText}>✏ Edit</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>

      {/* Add / Edit Post Modal */}
      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <HStack className="justify-between items-center mb-4">
              <Heading size="md" style={{ color: "#0f172a" }}>{selectedPost ? "Edit Post" : "Add Post"}</Heading>
              <TouchableOpacity onPress={() => setEditorVisible(false)}>
                <Text style={{ color: "#0052d4", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Title</Text>
                  <TextInput style={styles.input} value={editorTitle} onChangeText={setEditorTitle} placeholder="Post title" placeholderTextColor="#94a3b8" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Caption</Text>
                  <TextInput style={[styles.input, { minHeight: 80 }]} value={editorCaption} multiline onChangeText={setEditorCaption} placeholder="Write your post caption" placeholderTextColor="#94a3b8" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Hashtags</Text>
                  <TextInput style={styles.input} value={editorHashtags} onChangeText={setEditorHashtags} placeholder="summer, sales" placeholderTextColor="#94a3b8" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Status</Text>
                  <HStack space="sm">
                    {(["draft", "scheduled", "published"] as const).map((status) => (
                      <TouchableOpacity key={status} style={[styles.statusChip, editorStatus === status && styles.statusChipActive]} onPress={() => setEditorStatus(status)}>
                        <Text style={[styles.statusChipText, editorStatus === status && styles.statusChipTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Schedule Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Box style={[styles.input, styles.dateBox]}>
                      <Text style={{ color: editorDate ? "#0f172a" : "#94a3b8" }}>{editorDate ? new Date(editorDate).toLocaleString() : "Select date"}</Text>
                    </Box>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={datePickerValue || new Date()}
                      mode="datetime"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleDateChange}
                    />
                  )}
                </VStack>
              </VStack>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePost}>
              <Text style={styles.saveBtnText}>Save Post</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>

      {/* Options Menu Modal */}
      <Modal visible={optionsModalVisible} transparent animationType="fade" onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={styles.optionsModalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <Box style={styles.optionsModalCard}>
            <Text style={styles.optionsModalTitle} numberOfLines={1}>
              {actionPost?.title || actionPost?.caption || "Post Actions"}
            </Text>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => {
              setOptionsModalVisible(false);
              if (actionPost) handleOpenDetails(actionPost);
            }}>
              <Feather name="eye" size={18} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.optionItemText}>View Details</Text>
            </TouchableOpacity>

            {actionPost?.post_status === "draft" && (
              <TouchableOpacity style={styles.optionItem} onPress={() => {
                setOptionsModalVisible(false);
                if (actionPost?._id || actionPost?.id) handlePublish(actionPost._id || actionPost.id || "");
              }}>
                <Feather name="play" size={18} color="#1e293b" style={{ marginRight: 12 }} />
                <Text style={styles.optionItemText}>Publish Now</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.optionItem} onPress={() => {
              setOptionsModalVisible(false);
              if (actionPost) handleOpenEditor(actionPost);
            }}>
              <Feather name="edit-2" size={18} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.optionItemText}>Edit Post</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionItem, { borderBottomWidth: 0 }]} onPress={() => {
              setOptionsModalVisible(false);
              if (actionPost?._id || actionPost?.id) handleDelete(actionPost._id || actionPost.id || "");
            }}>
              <Feather name="trash-2" size={18} color="#dc2626" style={{ marginRight: 12 }} />
              <Text style={[styles.optionItemText, { color: "#dc2626" }]}>Delete Post</Text>
            </TouchableOpacity>
          </Box>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0052d4",
    paddingBottom: 4,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    marginRight: 4,
  },
  filterBtnActive: {
    backgroundColor: "#0052d4",
    borderColor: "#0052d4",
  },
  filterText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    lineHeight: 18,
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  cardImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
    alignSelf: "flex-end",
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-end",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  fabBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0052d4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    color: "#0f172a",
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0052d4",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: "#0f172a",
  },
  dateBox: {
    justifyContent: "center",
    minHeight: 44,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusChipActive: {
    backgroundColor: "#0052d4",
    borderColor: "#0052d4",
  },
  statusChipText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 12,
  },
  statusChipTextActive: {
    color: "#fff",
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: "#0052d4",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  optionsModalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  optionsModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionItemText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
});
