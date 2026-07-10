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
  Image,
  Platform,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { listPosts, createPost, updatePost, deletePost, publishPostNow, Post } from "./posts.api";

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; color: string; label: string }> = {
  published:        { bg: "#dcfce7", color: "#15803d", label: "Published" },
  scheduled:        { bg: "#dbeafe", color: "#1d4ed8", label: "Scheduled" },
  draft:            { bg: "#fef9c3", color: "#a16207", label: "Draft" },
  partial_published:{ bg: "#ede9fe", color: "#6d28d9", label: "Partial" },
  failed:           { bg: "#fee2e2", color: "#dc2626", label: "Failed" },
};

function StatusBadge({ status }: { status?: string }) {
  const meta = STATUS_META[status ?? "draft"] ?? { bg: "#f1f5f9", color: "#64748b", label: status ?? "—" };
  return (
    <Box style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
    </Box>
  );
}

// ── Filter tab ────────────────────────────────────────────────────────────────
const FILTERS = ["all", "published", "scheduled", "draft", "failed"];

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
              {item.charAt(0).toUpperCase() + item.slice(1)}
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
  onDelete,
  onPublish,
  onOpenDetails,
}: {
  post: Post;
  onDelete: () => void;
  onPublish: () => void;
  onOpenDetails: () => void;
}) {
  const id = post._id || post.id || "";
  const platforms = post.selectedNetworks ?? [];

  return (
    <Box style={styles.postCard}>
      <HStack className="justify-between items-start mb-2">
        <VStack space="xs" style={{ flex: 1, marginRight: 10 }}>
          <Text
            className="text-typography-800 font-semibold text-sm"
            numberOfLines={2}
          >
            {post.title || post.caption || "Untitled Post"}
          </Text>
          {platforms.length > 0 && (
            <Text className="text-typography-400 text-xs">
              📱 {platforms.join(", ")}
            </Text>
          )}
          {post.createdAt && (
            <Text className="text-typography-400 text-xs">
              🕐 {new Date(post.createdAt).toLocaleDateString("en-IN")}
            </Text>
          )}
        </VStack>
        <StatusBadge status={post.post_status} />
      </HStack>

      {/* Action buttons */}
      <HStack space="sm" className="mt-3">
        <TouchableOpacity style={styles.actionBtn} onPress={onOpenDetails}>
          <Text style={styles.actionBtnText}>👁 View</Text>
        </TouchableOpacity>
        {post.post_status === "draft" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPublish}
          >
            <Text style={styles.actionBtnText}>▶ Publish Now</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={onDelete}
        >
          <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>
            🗑 Delete
          </Text>
        </TouchableOpacity>
      </HStack>
    </Box>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PostsScreen() {
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
        const res = await listPosts(pg, 15, status);
        const items: Post[] = Array.isArray(res?.data) ? res.data : [];
        if (reset) {
          setPosts(items);
        } else {
          setPosts((prev) => [...prev, ...items]);
        }
        setHasMore(pg < (res?.pagination?.lastPage ?? 1));
        setPage(pg);
      } catch {
        // silently fail; show existing data
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter],
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
    <Box className="flex-1 bg-background-50">
      {/* Header */}
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <Heading size="xl" style={{ color: "#fff" }}>
            Posts
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            {posts.length} posts loaded
          </Text>
        </Box>
      </LinearGradient>

      <Box style={styles.topActions}>
        <TouchableOpacity onPress={() => handleOpenEditor()} style={styles.topActionBtn}>
          <Text style={styles.topActionText}>+ Add Post</Text>
        </TouchableOpacity>
      </Box>

      {/* Filters */}
      <FilterTabs active={filter} onChange={(f) => setFilter(f)} />

      {/* List */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
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
              tintColor="#193867"
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
                color="#193867"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onDelete={() => handleDelete(item._id || item.id || "")}
              onPublish={() => handlePublish(item._id || item.id || "")}
              onOpenDetails={() => handleOpenDetails(item)}
            />
          )}
        />
      )}

      <Modal visible={detailModalVisible} transparent animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <HStack className="justify-between items-center mb-4">
              <Heading size="md">Post Details</Heading>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={{ color: "#193867", fontWeight: "700" }}>Close</Text>
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

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalCard}>
            <HStack className="justify-between items-center mb-4">
              <Heading size="md">{selectedPost ? "Edit Post" : "Add Post"}</Heading>
              <TouchableOpacity onPress={() => setEditorVisible(false)}>
                <Text style={{ color: "#193867", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Title</Text>
                  <TextInput style={styles.input} value={editorTitle} onChangeText={setEditorTitle} placeholder="Post title" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Caption</Text>
                  <TextInput style={[styles.input, { minHeight: 80 }]} value={editorCaption} multiline onChangeText={setEditorCaption} placeholder="Write your post caption" />
                </VStack>
                <VStack space="xs">
                  <Text style={styles.detailLabel}>Hashtags</Text>
                  <TextInput style={styles.input} value={editorHashtags} onChangeText={setEditorHashtags} placeholder="summer, sales" />
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
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  topActions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: "#f8fafc" },
  topActionBtn: { alignSelf: "flex-start", backgroundColor: "#193867", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  topActionText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  filterList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterBtnActive: {
    backgroundColor: "#193867",
    borderColor: "#193867",
  },
  filterText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  filterTextActive: { color: "#ffffff" },
  listContent: { padding: 16, paddingBottom: 40 },
  postCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  actionBtnDanger: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#193867",
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
  detailLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  detailValue: { fontSize: 14, color: "#0f172a", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  dateBox: { justifyContent: "center", minHeight: 44 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusChipActive: { backgroundColor: "#193867", borderColor: "#193867" },
  statusChipText: { color: "#475569", fontWeight: "700", fontSize: 12 },
  statusChipTextActive: { color: "#fff" },
  saveBtn: { marginTop: 14, backgroundColor: "#193867", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
