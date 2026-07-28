import React, { useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Platform,
  Image,
  View,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { useAuth } from "@/context/AuthContext";
import { listPosts, deletePost, publishPostNow, Post } from "./posts.api";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

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
const FILTERS = ["all", "scheduled", "published", "failed", "partial", "draft"];

function FilterTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (f: string) => void;
}) {
  return (
    <View style={styles.filterTabsWrapper}>
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
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                ]}
              >
                {displayLabel} abhi
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({
  post,
  onPressCard,
  onOpenOptions,
}: {
  post: Post;
  onPressCard: () => void;
  onOpenOptions: () => void;
}) {
  const platforms = post.selectedNetworks ?? [];
  const previewImg = typeof post.image_url === "string" ? post.image_url : undefined;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPressCard}>
      <Box style={styles.postCard}>
        <HStack space="md" className="items-center" style={{ flex: 1 }}>
          {/* Left: Thumbnail */}
          {previewImg ? (
            <Image source={{ uri: previewImg }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <Image source={require("@/assets/images/360_image.jpg")} style={styles.cardImage} resizeMode="cover" />
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
                  return (
                    d.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }) +
                    " • " +
                    d.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  );
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
                  if (name.includes("facebook")) {
                    iconName = "facebook-square";
                    iconColor = "#1877f2";
                  } else if (name.includes("instagram")) {
                    iconName = "instagram";
                    iconColor = "#e1306c";
                  } else if (name.includes("whatsapp")) {
                    iconName = "whatsapp";
                    iconColor = "#25d366";
                  } else if (name.includes("twitter") || name.includes("x")) {
                    iconName = "twitter";
                    iconColor = "#1da1f2";
                  } else if (name.includes("linkedin")) {
                    iconName = "linkedin";
                    iconColor = "#0a66c2";
                  } else if (name.includes("youtube")) {
                    iconName = "youtube-play";
                    iconColor = "#ff0000";
                  }
                  if (!iconName) return null;
                  return (
                    <FontAwesome
                      key={idx}
                      name={iconName as any}
                      size={15}
                      color={iconColor}
                      style={{ marginRight: 4 }}
                    />
                  );
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
    </TouchableOpacity>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function PostsScreen() {
  const { user } = useAuth();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [actionPost, setActionPost] = useState<Post | null>(null);

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
        const rawItems = res?.data || (Array.isArray(res) ? res : res?.results || []);
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
    [filter, user]
  );

  useFocusEffect(
    useCallback(() => {
      fetchPosts(1, true);
    }, [fetchPosts])
  );

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

  const handlePublish = async (postId: string) => {
    try {
      await publishPostNow(postId);
      setPosts((prev) =>
        prev.map((p) =>
          (p._id || p.id) === postId ? { ...p, post_status: "published" } : p
        )
      );
      Alert.alert("Success", "Post published successfully!");
    } catch {
      Alert.alert("Error", "Failed to publish post.");
    }
  };

  const navigateToDetails = (postId?: string) => {
    if (!postId) return;
    router.push({
      pathname: "/pages/posts/post-details",
      params: { id: postId },
    });
  };

  const navigateToEditor = (postId?: string) => {
    if (postId) {
      router.push({
        pathname: "/pages/posts/post-editor",
        params: { id: postId },
      });
    } else {
      router.push("/pages/posts/post-editor");
    }
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <Box style={styles.header} className="px-5 pt-14 pb-4">
        <HStack className="justify-between items-center pb-4">
          <Heading size="xl" style={{ color: "#fff", fontWeight: "700" }}>
            Posts
          </Heading>
          <HStack space="md" className="items-center">
            <TouchableOpacity style={styles.addBtn} onPress={() => navigateToEditor()}>
              <Text style={styles.addBtnText}>+ Add Post</Text>
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
              onPressCard={() => navigateToDetails(item._id || item.id)}
              onOpenOptions={() => {
                setActionPost(item);
                setOptionsModalVisible(true);
              }}
            />
          )}
        />
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={optionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setOptionsModalVisible(false)}
        >
          <Box style={styles.optionsModalCard}>
            <Text style={styles.optionsModalTitle} numberOfLines={1}>
              {actionPost?.title || actionPost?.caption || "Post Actions"}
            </Text>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsModalVisible(false);
                if (actionPost?._id || actionPost?.id) {
                  navigateToDetails(actionPost._id || actionPost.id);
                }
              }}
            >
              <Feather name="eye" size={18} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.optionItemText}>View Details</Text>
            </TouchableOpacity>

            {actionPost?.post_status === "draft" && (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setOptionsModalVisible(false);
                  const targetId = actionPost?._id || actionPost?.id;
                  if (targetId) {
                    handlePublish(targetId);
                  }
                }}
              >
                <Feather name="play" size={18} color="#1e293b" style={{ marginRight: 12 }} />
                <Text style={styles.optionItemText}>Publish Now</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsModalVisible(false);
                const targetId = actionPost?._id || actionPost?.id;
                if (targetId) {
                  navigateToEditor(targetId);
                }
              }}
            >
              <Feather name="edit-2" size={18} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.optionItemText}>Edit Post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setOptionsModalVisible(false);
                const targetId = actionPost?._id || actionPost?.id;
                if (targetId) {
                  handleDelete(targetId);
                }
              }}
            >
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
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterTabsWrapper: {
    height: 54,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: "center",
  },
  filterBtn: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
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
