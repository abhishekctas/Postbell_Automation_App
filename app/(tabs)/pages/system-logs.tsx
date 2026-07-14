import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { LinearGradient } from "expo-linear-gradient";
import { listSystemLogs, SystemLog } from "./system-logs.api";
import { Calendar } from "react-native-calendars";

export default function SystemLogsScreen() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<"from" | "to" | null>(null);

  const fetchLogs = useCallback(
    async (pg = 1, reset = true) => {
      if (reset) setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: pg.toString(),
          limit: "15",
        });

        if (search.trim()) {
          queryParams.append("search", search.trim());
        }

        if (dateFrom) {
          const startDate = new Date(dateFrom);
          startDate.setHours(0, 0, 0, 0);
          queryParams.append("startDate", startDate.toString());
        }

        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          queryParams.append("endDate", endDate.toString());
        }

        const res = await listSystemLogs(queryParams.toString());
        const items = Array.isArray(res) ? res : res?.data || [];
        
        if (reset) {
          setLogs(items);
        } else {
          setLogs((prev) => [...prev, ...items]);
        }
        
        const lastPage = res?.pagination?.lastPage || 1;
        setHasMore(pg < lastPage);
        setPage(pg);
      } catch (error) {
        console.error("Error fetching system logs:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchLogs(1, true);
  }, [search, dateFrom, dateTo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(1, true);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchLogs(page + 1, false);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  const renderLogItem = ({ item }: { item: SystemLog }) => {
    const formattedDate = item.createdAt
      ? new Date(item.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

    return (
      <TouchableOpacity
        style={styles.logCard}
        onPress={() => setSelectedLog(item)}
        activeOpacity={0.7}
      >
        <VStack space="xs">
          <HStack className="justify-between items-center">
            <Box style={styles.opBadge}>
              <Text style={styles.opBadgeText}>{item.operation}</Text>
            </Box>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </HStack>
          <Text className="text-typography-900 font-semibold text-sm mt-2">
            By: {item.first_name} {item.last_name} ({item.role_name || "User"})
          </Text>
          <HStack className="justify-between items-center mt-2">
            <Text className="text-typography-400 text-xs">IP: {item.ip_address || "—"}</Text>
            <Text className="text-primary-700 text-xs font-semibold">View JSON ➔</Text>
          </HStack>
        </VStack>
      </TouchableOpacity>
    );
  };

  return (
    <Box className="flex-1 bg-background-50">
      {/* Header */}
      <LinearGradient colors={["#0f2444", "#193867"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <Heading size="xl" style={{ color: "#fff" }}>
            System Logs
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            Track system audits and changes
          </Text>
        </Box>
      </LinearGradient>

      {/* Filters Section */}
      <VStack space="sm" style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <HStack space="sm" className="w-full">
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1 }]}
            onPress={() => setShowDatePicker("from")}
          >
            <Text style={styles.dateButtonText}>
              📅 From: {dateFrom || "Any Date"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1 }]}
            onPress={() => setShowDatePicker("to")}
          >
            <Text style={styles.dateButtonText}>
              📅 To: {dateTo || "Any Date"}
            </Text>
          </TouchableOpacity>
          {(search || dateFrom || dateTo) && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearFilters}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </HStack>
      </VStack>

      {/* List */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
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
                No system logs found
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
          renderItem={renderLogItem}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(null)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.calendarContainer}>
            <Heading size="sm" className="mb-4 text-center">
              Select {showDatePicker === "from" ? "Start" : "End"} Date
            </Heading>
            <Calendar
              onDayPress={(day) => {
                if (showDatePicker === "from") {
                  setDateFrom(day.dateString);
                } else {
                  setDateTo(day.dateString);
                }
                setShowDatePicker(null);
              }}
              maxDate={new Date().toISOString().split("T")[0]}
              theme={{
                selectedDayBackgroundColor: "#193867",
                todayTextColor: "#193867",
                arrowColor: "#193867",
              }}
            />
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowDatePicker(null)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={selectedLog !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLog(null)}
      >
        <Box style={styles.modalOverlay}>
          <Box style={styles.detailsContainer}>
            <Heading size="md" className="mb-4">
              Log Details
            </Heading>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VStack space="md">
                <Box>
                  <Text style={styles.detailLabel}>Operation</Text>
                  <Text style={styles.detailValue}>{selectedLog?.operation}</Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Performed By</Text>
                  <Text style={styles.detailValue}>
                    {selectedLog?.first_name} {selectedLog?.last_name} ({selectedLog?.role_name})
                  </Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>IP Address</Text>
                  <Text style={styles.detailValue}>{selectedLog?.ip_address || "—"}</Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Created At</Text>
                  <Text style={styles.detailValue}>
                    {selectedLog?.createdAt ? new Date(selectedLog.createdAt).toLocaleString("en-IN") : "—"}
                  </Text>
                </Box>
                <Box>
                  <Text style={styles.detailLabel}>Operation Data</Text>
                  <Box style={styles.jsonContainer}>
                    <Text style={styles.jsonText}>
                      {JSON.stringify(selectedLog?.operation_data, null, 2)}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: "#193867", marginTop: 20 }]}
              onPress={() => setSelectedLog(null)}
            >
              <Text style={[styles.closeModalBtnText, { color: "#fff" }]}>Close Details</Text>
            </TouchableOpacity>
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
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  clearBtnText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  listContent: { padding: 16, paddingBottom: 40 },
  logCard: {
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
  opBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  opBadgeText: { fontSize: 11, fontWeight: "700", color: "#1d4ed8" },
  dateText: { fontSize: 11, color: "#94a3b8" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  detailsContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  closeModalBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    marginTop: 12,
  },
  closeModalBtnText: { fontSize: 14, fontWeight: "700", color: "#475569" },
  detailLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" },
  detailValue: { fontSize: 14, color: "#1e293b", fontWeight: "600", marginTop: 2 },
  jsonContainer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  jsonText: { fontSize: 11, color: "#0f172a", fontFamily: "monospace" },
});
