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
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
import {
  listBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  updateBlogStatus,
  getAllTags,
  BlogPost,
  Tag,
} from "./blogs.api";
import { router } from "expo-router";

export default function BlogsScreen() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showTagSelect, setShowTagSelect] = useState(false);
  const [status, setStatus] = useState<number>(1); // 1 = Published, 0 = Draft

  const fetchTagsList = async () => {
    try {
      const res = await getAllTags();
      setTags(res);
    } catch (e) {
      console.log("Failed to fetch blog tags:", e);
    }
  };

  const fetchBlogsList = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "10",
        });

        if (search.trim()) {
          queryParams.append("search", search.trim());
        }

        const res = await listBlogs(queryParams.toString());
        const items = res?.data || [];

        if (reset) {
          setBlogs(items);
        } else {
          setBlogs((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load blogs.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchTagsList();
    fetchBlogsList(1, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBlogsList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchBlogsList(page + 1, false);
  };

  const handleOpenAdd = () => {
    setEditingBlog(null);
    setTitle("");
    setSlug("");
    setExcerpt("");
    setBody("");
    setSelectedTag(tags[0] || null);
    setStatus(1);
    setModalVisible(true);
  };

  const handleOpenEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setTitle(blog.title || "");
    setSlug(blog.slug || "");
    setExcerpt(blog.excerpt || "");
    setBody(blog.body || "");
    const matchingTag = tags.find((t) => t._id === blog.category || t.id === blog.category);
    setSelectedTag(matchingTag || null);
    setStatus(blog.status ?? 1);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Title is required.");
      return;
    }
    if (!slug.trim()) {
      Alert.alert("Validation Error", "Slug is required.");
      return;
    }

    try {
      const payload: Partial<BlogPost> = {
        title,
        slug,
        excerpt,
        body,
        status,
        category: selectedTag?._id || selectedTag?.id || undefined,
      };

      if (editingBlog) {
        await updateBlog(editingBlog._id || editingBlog.id || "", payload);
        Alert.alert("Success", "Blog post updated successfully!");
      } else {
        await createBlog(payload);
        Alert.alert("Success", "Blog post created successfully!");
      }

      setModalVisible(false);
      fetchBlogsList(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save blog post.");
    }
  };

  const handleToggleStatus = async (blog: BlogPost) => {
    const id = blog._id || blog.id || "";
    try {
      await updateBlogStatus(id);
      setBlogs((prev) =>
        prev.map((b) => ((b._id || b.id) === id ? { ...b, status: b.status === 1 ? 0 : 1 } : b)),
      );
      Alert.alert("Success", "Blog status changed successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle status.");
    }
  };

  const handleDelete = (blog: BlogPost) => {
    const id = blog._id || blog.id || "";
    Alert.alert("Delete Blog", `Are you sure you want to delete the blog "${blog.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBlog(id);
            Alert.alert("Success", "Blog deleted successfully.");
            setBlogs((prev) => prev.filter((b) => (b._id || b.id) !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete blog.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BlogPost }) => {
    const isPub = item.status === 1;
    const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "—";

    return (
      <Box style={styles.card}>
        <HStack className="justify-between items-start">
          <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
            <Text className="text-typography-800 font-bold text-base">{item.title}</Text>
            <Text className="text-typography-400 text-xs">Slug: {item.slug} | Created: {formattedDate}</Text>
            {item.excerpt ? (
              <Text className="text-typography-500 text-sm mt-1">{item.excerpt}</Text>
            ) : null}
          </VStack>
          <VStack space="sm" className="items-end">
            <Box style={[styles.statusBadge, { backgroundColor: isPub ? "#dcfce7" : "#fef9c3" }]}>
              <Text style={{ color: isPub ? "#15803d" : "#a16207", fontSize: 10, fontWeight: "700" }}>
                {isPub ? "Published" : "Draft"}
              </Text>
            </Box>
            <TouchableOpacity style={styles.statusToggleAction} onPress={() => handleToggleStatus(item)}>
              <Text style={styles.statusToggleActionText}>{isPub ? "Make Draft" : "Publish"}</Text>
            </TouchableOpacity>
          </VStack>
        </HStack>

        <HStack space="sm" className="mt-4 justify-end">
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
            <Text style={styles.actionBtnText}>✏ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
            <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>🗑 Delete</Text>
          </TouchableOpacity>
        </HStack>
      </Box>
    );
  };

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Blog</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Blog Management
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Create and edit articles, guidelines, and content pages
          </Text>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </Box>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No blog articles found</Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} /> : null
          }
          renderItem={renderItem}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              {editingBlog ? "Edit Blog" : "Add Blog"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Title *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={title}
                    onChangeText={(val) => {
                      setTitle(val);
                      setSlug(val.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, ""));
                    }}
                    placeholder="Article title"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Slug *</Text>
                  <TextInput style={styles.modalInput} value={slug} onChangeText={setSlug} placeholder="article-slug" />
                </VStack>

                {/* Tag Selection */}
                <VStack space="xs">
                  <Text style={styles.label}>Category / Tag</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => setShowTagSelect(true)}>
                    <Text style={styles.selectBtnText}>{selectedTag ? selectedTag.title : "No category selected"}</Text>
                  </TouchableOpacity>
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Excerpt</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 45 }]}
                    value={excerpt}
                    onChangeText={setExcerpt}
                    multiline
                    placeholder="Short summary preview"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Body content</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 120 }]}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    placeholder="Enter HTML or text body content..."
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Status *</Text>
                  <HStack space="sm">
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                      onPress={() => setStatus(1)}
                    >
                      <Text style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}>Published</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnActiveDanger]}
                      onPress={() => setStatus(0)}
                    >
                      <Text style={[styles.statusToggleText, status === 0 && styles.statusToggleTextActiveDanger]}>Draft</Text>
                    </TouchableOpacity>
                  </HStack>
                </VStack>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <Button style={{ flex: 1 }} className="bg-primary-700 rounded-xl" onPress={handleSave}>
                <ButtonText>Save</ButtonText>
              </Button>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </HStack>
          </Box>
        </Box>
      </Modal>

      {/* Category / Tag Selection Modal */}
      <Modal visible={showTagSelect} transparent animationType="fade" onRequestClose={() => setShowTagSelect(false)}>
        <Box style={styles.modalOverlay}>
          <Box style={[styles.modalContainer, { maxWidth: 300 }]}>
            <Heading size="sm" className="mb-4">
              Select Category
            </Heading>
            <FlatList
              data={tags}
              keyExtractor={(t) => t._id || t.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectItem}
                  onPress={() => {
                    setSelectedTag(item);
                    setShowTagSelect(false);
                  }}
                >
                  <Text style={styles.selectBtnText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeSelectBtn} onPress={() => setShowTagSelect(false)}>
              <Text style={{ fontWeight: "700", color: "#64748b" }}>Close</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 4 },
  addBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusToggleAction: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f8fafc",
  },
  statusToggleActionText: { fontSize: 10, color: "#475569", fontWeight: "600" },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  actionBtnDanger: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
  },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#193867" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  selectBtn: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
  },
  selectBtnText: { fontSize: 14, color: "#1e293b" },
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
  statusToggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  statusToggleTextActive: { color: "#15803d" },
  statusToggleTextActiveDanger: { color: "#dc2626" },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
  selectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  closeSelectBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
});
