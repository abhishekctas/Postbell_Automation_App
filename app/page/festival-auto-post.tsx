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
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { LinearGradient } from "expo-linear-gradient";
import {
  listFestivalPosts,
  updateFestivalPostSelection,
  updateFestivalPost,
  createFestivalPost,
  sendFestivalNotifications,
  FestivalPost,
} from "./festival-auto-post.api";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function FestivalAutoPostScreen() {
  const [posts, setPosts] = useState<FestivalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<FestivalPost | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedFestival, setSelectedFestival] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date | null>(null);

  const fetchFestivalPostsList = useCallback(
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

  const handleToggleSelection = async (item: FestivalPost) => {
    const id = item._id || item.id || "";
    const nextVal = !item.selectedFestival;
    try {
      await updateFestivalPostSelection(id, nextVal);
      setPosts((prev) =>
        prev.map((p) => ((p._id || p.id) === id ? { ...p, selectedFestival: nextVal } : p)),
      );
      Alert.alert("Success", `Festival automated posting ${nextVal ? "enabled" : "disabled"}.`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle festival selection.");
    }
  };

  const handleSendNotification = async (item: FestivalPost) => {
    try {
      await sendFestivalNotifications(item.name);
      Alert.alert("Notifications Sent", `Successfully triggered notifications for ${item.name}!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to trigger notifications.");
    }
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    setName("");
    setDate("");
    setCategory("");
    setStatus("active");
    setSelectedFestival(false);
    setAutoGenerate(false);
    setCaption("");
    setHashtags("");
    setImageUrl("");
    setModalVisible(true);
  };

  const handleOpenEdit = (post: FestivalPost) => {
    setEditingPost(post);
    setName(post.name || "");
    setDate(post.date || "");
    setCategory(post.category || "");
    setStatus(post.status || "active");
    setSelectedFestival(post.selectedFestival || false);
    setAutoGenerate(post.autoGenerate || false);
    setCaption(post.caption || "");
    setHashtags(post.hashtags?.join(", ") || "");
    setImageUrl(post.image || post.image_url || "");
    setModalVisible(true);
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0];
      setDate(isoDate);
      setDatePickerValue(selectedDate);
    }
  };

  const openDatePicker = () => {
    const currentDate = date ? new Date(date) : new Date();
    setDatePickerValue(isNaN(currentDate.getTime()) ? new Date() : currentDate);
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Festival name is required.");
      return;
    }
    if (!date.trim()) {
      Alert.alert("Validation Error", "Date (YYYY-MM-DD) is required.");
      return;
    }

    try {
      const hashtagsArray = hashtags
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const payload: Partial<FestivalPost> = {
        name,
        date,
        category,
        status,
        selectedFestival,
        autoGenerate,
        caption,
        hashtags: hashtagsArray,
        image: imageUrl || undefined,
      };

      if (editingPost) {
        await updateFestivalPost(editingPost._id || editingPost.id || "", payload);
        Alert.alert("Success", "Festival post configuration updated!");
      } else {
        await createFestivalPost(payload);
        Alert.alert("Success", "Festival post configuration created!");
      }

      setModalVisible(false);
      fetchFestivalPostsList(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save festival configuration.");
    }
  };

  const renderItem = ({ item }: { item: FestivalPost }) => {
    const isAct = item.status === "active";
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString("en-IN") : "—";
    const previewImg = item.image || item.image_url;

    return (
      <Box style={styles.card}>
        <HStack space="md" className="items-start">
          {previewImg ? (
            <Image source={{ uri: previewImg }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <Box style={styles.placeholderImage}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </Box>
          )}
          <VStack space="xs" style={{ flex: 1 }}>
            <Text className="text-typography-800 font-bold text-base">{item.name}</Text>
            <Text className="text-typography-500 text-sm">
              Date: {formattedDate} {item.category ? `• ${item.category}` : ""}
            </Text>

            {/* Switches */}
            <HStack className="justify-between items-center mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#334155" }}>Auto Post Select</Text>
              <Switch value={item.selectedFestival} onValueChange={() => handleToggleSelection(item)} />
            </HStack>
            <HStack className="justify-between items-center mt-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#334155" }}>Auto Generate Content</Text>
              <Switch
                value={item.autoGenerate}
                onValueChange={async (val) => {
                  const id = item._id || item.id || "";
                  try {
                    await updateFestivalPost(id, { autoGenerate: val });
                    setPosts((prev) =>
                      prev.map((p) => ((p._id || p.id) === id ? { ...p, autoGenerate: val } : p)),
                    );
                  } catch (e: any) {
                    Alert.alert("Error", e.message || "Failed to update toggle.");
                  }
                }}
              />
            </HStack>

            <HStack space="sm" className="mt-4 justify-end">
              <TouchableOpacity style={styles.notifyBtn} onPress={() => handleSendNotification(item)}>
                <Text style={styles.notifyBtnText}>🔔 Send Alert</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(item)}>
                <Text style={styles.actionBtnText}>✏ Edit</Text>
              </TouchableOpacity>
            </HStack>
          </VStack>
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
              <Text style={styles.addBtnText}>+ Add Festival</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Festival Auto Post
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Configure and schedule automated posting triggers for regional festivals
          </Text>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search festival name or category..."
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
          data={posts}
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
              <Text className="text-typography-400 text-base">No festival posts found</Text>
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
              {editingPost ? "Edit Festival" : "Add Festival"}
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <VStack space="xs">
                  <Text style={styles.label}>Festival Name *</Text>
                  <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="e.g. Diwali" />
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Date (YYYY-MM-DD) *</Text>
                    <TouchableOpacity onPress={openDatePicker}>
                      <Box style={[styles.modalInput, styles.datePickerBox]}>
                        <Text style={{ color: date ? "#0f172a" : "#94a3b8" }}>{date || "Select date"}</Text>
                      </Box>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={datePickerValue || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleDateChange}
                      />
                    )}
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Category</Text>
                    <TextInput style={styles.modalInput} value={category} onChangeText={setCategory} placeholder="National" />
                  </VStack>
                </HStack>

                <VStack space="xs">
                  <Text style={styles.label}>Image URL</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                    placeholder="https://example.com/diwali.jpg"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Caption</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 60 }]}
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    placeholder="Auto post template caption..."
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Hashtags (comma separated)</Text>
                  <TextInput style={styles.modalInput} value={hashtags} onChangeText={setHashtags} placeholder="festival, diwali" />
                </VStack>

                <HStack className="justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>Auto Post Select</Text>
                  <Switch value={selectedFestival} onValueChange={setSelectedFestival} />
                </HStack>

                <HStack className="justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155" }}>Auto Generate Content</Text>
                  <Switch value={autoGenerate} onValueChange={setAutoGenerate} />
                </HStack>

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
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  notifyBtn: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  notifyBtnText: { fontSize: 12, fontWeight: "600", color: "#b45309" },
  actionBtn: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
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
  datePickerBox: {
    justifyContent: "center",
    minHeight: 44,
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
});
