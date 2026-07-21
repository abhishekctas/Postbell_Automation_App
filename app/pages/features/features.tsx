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
  listFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
  updateFeatureStatus,
  Feature,
  FeaturePoint,
} from "./features.api";
import { router } from "expo-router";

export default function FeaturesScreen() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("0");
  const [status, setStatus] = useState<number>(1); // 1 = Active, 0 = Inactive

  // Feature Points sub-state
  const [featurePoints, setFeaturePoints] = useState<FeaturePoint[]>([]);
  const [pointTitle, setPointTitle] = useState("");
  const [pointDesc, setPointDesc] = useState("");
  const [pointIcon, setPointIcon] = useState("");

  const fetchFeaturesList = useCallback(
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

        const res = await listFeatures(queryParams.toString());
        // Backend returns either direct array or { data, pagination }
        const items = res?.data || (Array.isArray(res) ? res : []);

        if (reset) {
          setFeatures(items);
        } else {
          setFeatures((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load features.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchFeaturesList(1, true);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeaturesList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFeaturesList(page + 1, false);
  };

  const handleOpenAdd = () => {
    setEditingFeature(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setOrder("0");
    setStatus(1);
    setFeaturePoints([]);
    setPointTitle("");
    setPointDesc("");
    setPointIcon("");
    setModalVisible(true);
  };

  const handleOpenEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setTitle(feature.title || "");
    setSlug(feature.slug || "");
    setDescription(feature.description || "");
    setOrder(feature.order ? String(feature.order) : "0");
    setStatus(feature.status ?? 1);
    setFeaturePoints(feature.feature_points || []);
    setPointTitle("");
    setPointDesc("");
    setPointIcon("");
    setModalVisible(true);
  };

  const handleAddFeaturePoint = () => {
    if (!pointTitle.trim()) {
      Alert.alert("Validation Error", "Feature Point Title is required.");
      return;
    }
    const newPoint: FeaturePoint = {
      point_title: pointTitle,
      point_description: pointDesc,
      icon: pointIcon || "star",
    };
    setFeaturePoints((prev) => [...prev, newPoint]);
    setPointTitle("");
    setPointDesc("");
    setPointIcon("");
  };

  const handleRemoveFeaturePoint = (index: number) => {
    setFeaturePoints((prev) => prev.filter((_, i) => i !== index));
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
      const payload = {
        title,
        slug,
        description,
        order: Number(order),
        status,
        feature_points: featurePoints,
      };

      if (editingFeature) {
        await updateFeature(editingFeature._id || editingFeature.id || "", payload);
        Alert.alert("Success", "Feature updated successfully!");
      } else {
        await createFeature(payload);
        Alert.alert("Success", "Feature created successfully!");
      }

      setModalVisible(false);
      fetchFeaturesList(1, true);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save feature.");
    }
  };

  const handleToggleStatus = async (item: Feature) => {
    const id = item._id || item.id || "";
    const nextStatusVal = item.status === 1 ? 0 : 1;
    try {
      await updateFeatureStatus(id, nextStatusVal === 1);
      setFeatures((prev) =>
        prev.map((f) => ((f._id || f.id) === id ? { ...f, status: nextStatusVal } : f)),
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update feature status.");
    }
  };

  const handleDelete = (item: Feature) => {
    const id = item._id || item.id || "";
    Alert.alert("Delete Feature", `Are you sure you want to delete the feature "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFeature(id);
            Alert.alert("Success", "Feature deleted successfully.");
            setFeatures((prev) => prev.filter((f) => (f._id || f.id) !== id));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete feature.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Feature }) => {
    const isAct = item.status === 1;

    return (
      <Box style={styles.card}>
        <HStack className="justify-between items-start">
          <VStack space="xs" style={{ flex: 1, marginRight: 8 }}>
            <Text className="text-typography-100 font-bold text-base">{item.title}</Text>
            <Text className="text-typography-400 text-xs">Slug: {item.slug} | Order: {item.order}</Text>
            {item.description ? (
              <Text className="text-typography-500 text-sm mt-1">{item.description}</Text>
            ) : null}

            {item.feature_points?.length > 0 && (
              <Box className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", marginBottom: 4 }}>
                  Feature Highlights ({item.feature_points.length}):
                </Text>
                {item.feature_points.map((pt, i) => (
                  <Text key={pt._id || i} style={styles.highlightText}>
                    • [{pt.icon || "star"}] {pt.point_title}
                  </Text>
                ))}
              </Box>
            )}
          </VStack>
          <VStack space="sm" className="items-end">
            <Box style={[styles.statusBadge, { backgroundColor: isAct ? "#dcfce7" : "#fee2e2" }]}>
              <Text style={{ color: isAct ? "#15803d" : "#dc2626", fontSize: 10, fontWeight: "700" }}>
                {isAct ? "Active" : "Inactive"}
              </Text>
            </Box>
            <TouchableOpacity style={styles.statusToggleAction} onPress={() => handleToggleStatus(item)}>
              <Text style={styles.statusToggleActionText}>{isAct ? "Deactivate" : "Activate"}</Text>
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
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Add Feature</Text>
            </TouchableOpacity>
          </HStack>
          <Heading size="xl" style={{ color: "#fff" }}>
            Features
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Manage features and highlights displayed on frontend portals
          </Text>
        </Box>
      </LinearGradient>

      {/* Search Input */}
      <Box style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search features..."
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
          data={features}
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
              <Text className="text-typography-400 text-base">No features found</Text>
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
              {editingFeature ? "Edit Feature" : "Add Feature"}
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
                    placeholder="e.g. AI Writer"
                  />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Slug *</Text>
                  <TextInput style={styles.modalInput} value={slug} onChangeText={setSlug} placeholder="e.g. ai-writer" />
                </VStack>

                <VStack space="xs">
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.modalInput, { minHeight: 50 }]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Short description"
                  />
                </VStack>

                <HStack space="md">
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Display Order</Text>
                    <TextInput style={styles.modalInput} value={order} onChangeText={setOrder} keyboardType="numeric" placeholder="0" />
                  </VStack>
                  <VStack space="xs" style={{ flex: 1 }}>
                    <Text style={styles.label}>Status *</Text>
                    <HStack space="xs">
                      <TouchableOpacity
                        style={[styles.statusToggleBtn, status === 1 && styles.statusToggleBtnActive]}
                        onPress={() => setStatus(1)}
                      >
                        <Text style={[styles.statusToggleText, status === 1 && styles.statusToggleTextActive]}>Active</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statusToggleBtn, status === 0 && styles.statusToggleBtnActiveDanger]}
                        onPress={() => setStatus(0)}
                      >
                        <Text style={[styles.statusToggleText, status === 0 && styles.statusToggleTextActiveDanger]}>Inactive</Text>
                      </TouchableOpacity>
                    </HStack>
                  </VStack>
                </HStack>

                {/* Sub-form to manage feature points */}
                <Box style={styles.subformContainer}>
                  <Heading size="xs" className="mb-2 text-typography-700">
                    Manage Feature Points ({featurePoints.length})
                  </Heading>
                  <VStack space="xs" className="mb-3">
                    <TextInput style={styles.subformInput} value={pointTitle} onChangeText={setPointTitle} placeholder="Point Title *" />
                    <TextInput style={styles.subformInput} value={pointDesc} onChangeText={setPointDesc} placeholder="Point Description" />
                    <TextInput style={styles.subformInput} value={pointIcon} onChangeText={setPointIcon} placeholder="Icon (e.g. check, star)" />
                    <TouchableOpacity style={styles.subformAddBtn} onPress={handleAddFeaturePoint}>
                      <Text style={styles.subformAddBtnText}>+ Add Highlight Point</Text>
                    </TouchableOpacity>
                  </VStack>

                  {featurePoints.map((pt, index) => (
                    <HStack key={index} className="justify-between items-center bg-white p-2 rounded-lg border border-slate-100 mb-1">
                      <VStack style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#334155" }}>
                          [{pt.icon}] {pt.point_title}
                        </Text>
                        {pt.point_description ? (
                          <Text style={{ fontSize: 10, color: "#64748b" }}>{pt.point_description}</Text>
                        ) : null}
                      </VStack>
                      <TouchableOpacity onPress={() => handleRemoveFeaturePoint(index)}>
                        <Text style={{ fontSize: 11, color: "#dc2626", fontWeight: "700" }}>Remove</Text>
                      </TouchableOpacity>
                    </HStack>
                  ))}
                </Box>
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
  headerIllustration: {
    width: 90,
    height: 80,
    marginTop: 4,
  },
  illustrationWindow: {
    width: 78,
    height: 62,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: 8,
  },
  illustrationDots: {
    gap: 3,
  },
  illustrationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  illustrationCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#193867",
  },
  illustrationLine: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  illustrationLineWide: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
  },
  illustrationStarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sparkleTopLeft: {
    position: "absolute",
    top: -6,
    left: -10,
    fontSize: 12,
    opacity: 0.8,
  },
  sparkleTopRight: {
    position: "absolute",
    top: 8,
    right: -6,
    fontSize: 12,
    opacity: 0.8,
  },
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
  highlightText: { fontSize: 11, color: "#475569", marginTop: 2 },
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
  subformContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 8,
  },
  subformInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#1e293b",
    backgroundColor: "#fff",
    marginBottom: 6,
  },
  subformAddBtn: {
    backgroundColor: "#193867",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 4,
  },
  subformAddBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
});
