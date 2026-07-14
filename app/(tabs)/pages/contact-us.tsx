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
import { listContactRequests, updateContactStatus, deleteContactRequest, ContactRequest } from "./contact-us.api";
import { router } from "expo-router";

export default function ContactUsScreen() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);

  const fetchRequestsList = useCallback(
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

        if (filter === "pending") {
          queryParams.append("contactStatus", "0");
        } else if (filter === "resolved") {
          queryParams.append("contactStatus", "1");
        }

        const res = await listContactRequests(queryParams.toString());
        const items = res?.data || [];

        if (reset) {
          setRequests(items);
        } else {
          setRequests((prev) => [...prev, ...items]);
        }

        setHasMore(items.length >= 10);
        setPage(pg);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load support inquiries.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, filter],
  );

  useEffect(() => {
    fetchRequestsList(1, true);
  }, [search, filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequestsList(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchRequestsList(page + 1, false);
  };

  const handleToggleStatus = async (item: ContactRequest) => {
    const id = item._id || item.id || "";
    const nextStatus = item.contactStatus === 1 ? 0 : 1;
    const label = nextStatus === 1 ? "Resolved" : "Pending";
    try {
      await updateContactStatus(id, nextStatus);
      setRequests((prev) =>
        prev.map((r) => ((r._id || r.id) === id ? { ...r, contactStatus: nextStatus } : r)),
      );
      if (selectedRequest && (selectedRequest._id || selectedRequest.id) === id) {
        setSelectedRequest((prev) => (prev ? { ...prev, contactStatus: nextStatus } : null));
      }
      Alert.alert("Success", `Inquiry status changed to ${label}.`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update inquiry status.");
    }
  };

  const handleDelete = (item: ContactRequest) => {
    const id = item._id || item.id || "";
    Alert.alert("Delete Inquiry", "Are you sure you want to delete this contact request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContactRequest(id);
            Alert.alert("Success", "Inquiry deleted successfully.");
            setRequests((prev) => prev.filter((r) => (r._id || r.id) !== id));
            setSelectedRequest(null);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete inquiry.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ContactRequest }) => {
    const isResolved = item.contactStatus === 1;
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedRequest(item)} activeOpacity={0.8}>
        <VStack space="xs">
          <HStack className="justify-between items-start">
            <Box style={{ flex: 1, marginRight: 8 }}>
              <Text className="text-typography-900 font-bold text-base" numberOfLines={1}>
                {item.subject || "No Subject"}
              </Text>
              <Text className="text-typography-400 text-xs mt-1">🕐 {formattedDate}</Text>
            </Box>
            <Box style={[styles.statusBadge, { backgroundColor: isResolved ? "#dcfce7" : "#fef9c3" }]}>
              <Text style={{ color: isResolved ? "#15803d" : "#a16207", fontSize: 10, fontWeight: "700" }}>
                {isResolved ? "Resolved" : "Pending"}
              </Text>
            </Box>
          </HStack>

          <Text className="text-typography-700 font-semibold text-sm mt-2">
            By: {item.first_name} {item.last_name}
          </Text>
          <Text className="text-typography-500 text-sm mt-1" numberOfLines={2}>
            {item.message}
          </Text>

          <HStack space="sm" className="mt-4 justify-end">
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(item)}>
              <Text style={styles.actionBtnText}>{isResolved ? "↺ Mark Pending" : "✓ Mark Resolved"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item)}>
              <Text style={[styles.actionBtnText, { color: "#dc2626" }]}>🗑 Delete</Text>
            </TouchableOpacity>
          </HStack>
        </VStack>
      </TouchableOpacity>
    );
  };

  return (
    <Box className="flex-1 bg-background-50">
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="mb-2">
            <Text className="text-white text-sm font-medium">← Back</Text>
          </TouchableOpacity>
          <Heading size="xl" style={{ color: "#fff" }}>
            Contact Inquiries
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Read and resolve support and contact inquiries
          </Text>
        </Box>
      </LinearGradient>

      {/* Search and Filters */}
      <VStack space="sm" style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or subject..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <HStack space="sm" className="w-full">
          {(["all", "pending", "resolved"] as const).map((btn) => (
            <TouchableOpacity
              key={btn}
              style={[styles.tabBtn, filter === btn && styles.tabBtnActive]}
              onPress={() => setFilter(btn)}
            >
              <Text style={[styles.tabText, filter === btn && styles.tabTextActive]}>
                {btn.charAt(0).toUpperCase() + btn.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </HStack>
      </VStack>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={requests}
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
              <Text className="text-typography-400 text-base">No inquiries found</Text>
            </Box>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} /> : null
          }
          renderItem={renderItem}
        />
      )}

      {/* Details Modal */}
      <Modal visible={selectedRequest !== null} transparent animationType="slide" onRequestClose={() => setSelectedRequest(null)}>
        <Box style={styles.modalOverlay}>
          <Box style={styles.modalContainer}>
            <Heading size="md" className="mb-4">
              Inquiry Details
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <Box>
                  <Text style={styles.detailLabel}>Subject</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.subject || "No Subject"}</Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Sender Details</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest?.first_name} {selectedRequest?.last_name}
                  </Text>
                  <Text className="text-typography-500 text-xs mt-1">📧 {selectedRequest?.email}</Text>
                  {selectedRequest?.contact_no ? (
                    <Text className="text-typography-500 text-xs mt-0.5">📞 {selectedRequest?.contact_no}</Text>
                  ) : null}
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Box
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: selectedRequest?.contactStatus === 1 ? "#dcfce7" : "#fef9c3",
                        alignSelf: "flex-start",
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text style={{ color: selectedRequest?.contactStatus === 1 ? "#15803d" : "#a16207", fontSize: 10, fontWeight: "700" }}>
                      {selectedRequest?.contactStatus === 1 ? "Resolved" : "Pending"}
                    </Text>
                  </Box>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Message</Text>
                  <Box style={styles.messageBox}>
                    <Text className="text-typography-900 text-sm leading-5">{selectedRequest?.message}</Text>
                  </Box>
                </Box>
              </VStack>
            </ScrollView>

            <HStack space="sm" className="mt-6">
              <Button
                style={{ flex: 1 }}
                className="bg-primary-700 rounded-xl"
                onPress={() => selectedRequest && handleToggleStatus(selectedRequest)}
              >
                <ButtonText>{selectedRequest?.contactStatus === 1 ? "Mark Pending" : "Mark Resolved"}</ButtonText>
              </Button>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: "#fee2e2" }]}
                onPress={() => selectedRequest && handleDelete(selectedRequest)}
              >
                <Text style={{ color: "#dc2626", fontWeight: "700" }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedRequest(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
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
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabBtnActive: {
    backgroundColor: "#193867",
    borderColor: "#193867",
  },
  tabText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  tabTextActive: { color: "#ffffff" },
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
  detailLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 14, color: "#1e293b", fontWeight: "600", marginTop: 2 },
  messageBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
});
