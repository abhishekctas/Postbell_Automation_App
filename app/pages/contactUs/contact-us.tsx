import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  View,
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

// NOTE: HtmlTable has been swapped for a native card list so the screen can match
// the requested design. No data-fetching, filtering, search, toggle, or delete
// logic was touched — only how each row is rendered.

const AVATAR_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8" }, // blue
  { bg: "#dcfce7", text: "#15803d" }, // green
  { bg: "#ede9fe", text: "#6d28d9" }, // purple
  { bg: "#fce7f3", text: "#be185d" }, // pink
  { bg: "#cffafe", text: "#0e7490" }, // cyan
  { bg: "#fef9c3", text: "#a16207" }, // yellow
];

function getInitials(item: ContactRequest) {
  const first = item.first_name?.trim()?.[0] || "";
  const last = item.last_name?.trim()?.[0] || "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

function getAvatarColors(item: ContactRequest) {
  const key = `${item._id || item.id || item.email || ""}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash];
}

function formatDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

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

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      <LinearGradient
        colors={["#2563EB", "#1D4ED8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Background Glow */}
        <Box style={styles.headerGlow} />

        <Box style={styles.headerContent}>
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <HStack
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 20,
            }}
          >
            {/* Left */}
            <VStack style={{ flex: 1, paddingRight: 15 }}>
              <Heading style={styles.headerTitle}>
                Contact
              </Heading>

              <Text style={styles.headerSubtitle}>
                Read and resolve support and contact inquiries
              </Text>
            </VStack>

            {/* Right Illustration */}
            <Box style={styles.iconContainer}>
              <Text style={styles.headerEmoji}>📩</Text>
            </Box>
          </HStack>
        </Box>
      </LinearGradient>

      {/* Search and Filters */}
      <VStack space="sm" style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Search by name, email, or subject..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <HStack space="sm" className="w-full">
          {(["all", "pending", "resolved"] as const).map((btn) => {
            const icon = btn === "all" ? "▦" : btn === "pending" ? "🕐" : "✓";
            const isActive = filter === btn;
            return (
              <TouchableOpacity
                key={btn}
                style={[
                  styles.tabBtn,
                  isActive && styles.tabBtnActive,
                  btn === "pending" && !isActive && styles.tabBtnPending,
                  btn === "resolved" && !isActive && styles.tabBtnResolved,
                ]}
                onPress={() => setFilter(btn)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                    btn === "pending" && !isActive && styles.tabTextPending,
                    btn === "resolved" && !isActive && styles.tabTextResolved,
                  ]}
                >
                  {icon}  {btn.charAt(0).toUpperCase() + btn.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </HStack>
      </VStack>

      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#193867" />
          }
        >
          {requests.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">No inquiries found</Text>
            </Box>
          ) : (
            requests.map((item) => {
              console.log(item, '')
              const id = item._id || item.id || "";
              const isResolved = item.contactStatus === 1;
              const avatarColors = getAvatarColors(item);
              const name = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Unknown";

              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => setSelectedRequest(item)}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {name
                        .split(" ")
                        .map((x) => x[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name}</Text>

                    <Text style={styles.subject}>
                      {item.subject || "General Inquiry"}
                    </Text>

                    <Text style={styles.date}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "N/A"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.status,
                      item.contactStatus === 1
                        ? styles.resolved
                        : styles.pending,
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          item.contactStatus === 1
                            ? "#16A34A"
                            : "#F59E0B",
                        fontWeight: "700",
                      }}
                    >
                      {item.contactStatus === 1
                        ? "Resolved"
                        : "Pending"}
                    </Text>
                  </View>

                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
          {loadingMore && (
            <ActivityIndicator size="small" color="#193867" style={{ marginVertical: 20 }} />
          )}
        </ScrollView>
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
                    <Text className="text-typography-100 text-sm leading-5">{selectedRequest?.message}</Text>
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
  headerIllustration: {
    position: "absolute",
    top: 8,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBubble: {
    position: "absolute",
    top: -8,
    right: -18,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  header: {
    height: 220,
    // borderBottomLeftRadius: 28,
    // borderBottomRightRadius: 28,
    overflow: "hidden",
    paddingBottom: 4,
  },

  headerContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 58,
  },

  headerGlow: {
    position: "absolute",
    right: -50,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  backIcon: {
    color: "#fff",
    fontSize: 20,
    marginRight: 8,
    fontWeight: "600",
  },

  backText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "700",
    marginBottom: 10,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 17,
    lineHeight: 24,
  },

  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerEmoji: {
    fontSize: 64,
  },
  filterSection: { padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tabBtnActive: {
    backgroundColor: "#193867",
    borderColor: "#193867",
  },
  tabBtnPending: {
    backgroundColor: "#fef9c3",
    borderColor: "#fef08a",
  },
  tabBtnResolved: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },
  tabText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  tabTextActive: { color: "#ffffff" },
  tabTextPending: { color: "#a16207" },
  tabTextResolved: { color: "#15803d" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E8F0FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardName: { fontSize: 15, fontWeight: "700", color: "#0f2444" },
  cardSubject: { fontSize: 13, color: "#64748b" },
  cardDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  chevron: { fontSize: 20, color: "#cbd5e1", fontWeight: "700" },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
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

  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2563EB",
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#193867",
  },

  subject: {
    marginTop: 4,
    color: "#64748B",
  },

  date: {
    marginTop: 6,
    color: "#94A3B8",
    fontSize: 12,
  },

  status: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginHorizontal: 10,
  },

  pending: {
    backgroundColor: "#FFF7E6",
  },

  resolved: {
    backgroundColor: "#ECFDF5",
  },

  arrow: {
    fontSize: 26,
    color: "#94A3B8",
  },
});