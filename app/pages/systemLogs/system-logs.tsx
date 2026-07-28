import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
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
import { router } from "expo-router";
import HtmlTable, { HtmlTableColumn } from "@/components/HtmlTable";
import { Feather } from "@expo/vector-icons";

function getPageNumbers(currentPage: number, lastPage: number) {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(lastPage, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

const LOG_TABLE_COLUMNS: HtmlTableColumn<SystemLog>[] = [
  // 1. 📅 CREATED AT
  {
    key: "createdAt",
    label: "Created At",
    width: "150px",
    render: (v) => {
      if (!v) return "—";
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      return (
        <VStack style={{ justifyContent: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#1e293b" }}>{dateStr}</Text>
          <Text style={{ fontSize: 11, color: "#64748b" }}>{timeStr}</Text>
        </VStack>
      );
    },
  },

  // 2. ⚡ OPERATION
  {
    key: "operation",
    label: "Operation",
    width: "140px",
    render: (v) => {
      const op = String(v || "—").toUpperCase();
      let bg = "#eff6ff";
      let color = "#2563eb";
      let border = "#bfdbfe";

      if (op.includes("CREATE") || op.includes("ADD") || op.includes("POST")) {
        bg = "#dcfce7";
        color = "#15803d";
        border = "#86efac";
      } else if (op.includes("DELETE") || op.includes("REMOVE") || op.includes("CANCEL")) {
        bg = "#ffe4e6";
        color = "#be123c";
        border = "#fca5a5";
      } else if (op.includes("AUTH") || op.includes("LOGIN")) {
        bg = "#f3e8ff";
        color = "#6b21a8";
        border = "#d8b4fe";
      }

      return (
        <Box
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: color, fontWeight: "700", fontSize: 11 }}>
            • {op}
          </Text>
        </Box>
      );
    },
  },

  // 3. 👤 USER
  {
    key: "first_name",
    label: "User",
    width: "200px",
    render: (_v, row) => {
      const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.operation_by || "System User";
      const role = row.role_name || "User";
      const initials =
        name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase())
          .join("") || "SU";

      const bgColors = ["#dbeafe", "#e9d5ff", "#ffedd5", "#ccfbf1", "#fef3c7"];
      const textColors = ["#1e40af", "#6b21a8", "#c2410c", "#0f766e", "#b45309"];
      const charCode = name.charCodeAt(0) || 0;
      const colorIdx = charCode % bgColors.length;

      return (
        <HStack space="sm" className="items-center">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: bgColors[colorIdx],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: textColors[colorIdx], fontWeight: "700", fontSize: 13 }}>
              {initials}
            </Text>
          </Box>
          <VStack style={{ justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1e293b" }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ fontSize: 11, color: "#64748b" }} numberOfLines={1}>
              {role}
            </Text>
          </VStack>
        </HStack>
      );
    },
  },

  // 4. 🔑 KEY
  {
    key: "key",
    label: "Key",
    width: "140px",
    render: (v) => (
      <Text style={{ fontSize: 13, color: "#475569", fontWeight: "500" }} numberOfLines={1}>
        {v ? String(v) : "—"}
      </Text>
    ),
  },

  // 5. 🌐 IP ADDRESS
  {
    key: "ip_address",
    label: "IP Address",
    width: "130px",
    render: (v) => (
      <Text style={{ fontSize: 13, color: "#475569", fontFamily: "monospace", fontWeight: "600" }}>
        {v ? String(v) : "—"}
      </Text>
    ),
  },
];

const LOG_ROW_ACTIONS = [
  { label: "View Details", action: "view", style: "normal" },
];

export default function SystemLogsScreen() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<"from" | "to" | null>(null);

  const fetchLogs = useCallback(
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

        setLogs(items);

        const lastPage = res?.pagination?.lastPage || (items.length >= 10 ? pg + 1 : pg);
        setTotalPages(Math.max(1, lastPage));
        setHasMore(pg < lastPage);
        setPage(pg);
      } catch (error) {
        console.error("Error fetching system logs:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
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

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <Box className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <LinearGradient colors={["#2563EB", "#1D4ED8"]} style={styles.header}>
        <Box className="px-5 pt-14 pb-4">
          <HStack className="justify-between items-center mb-2">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-white text-sm font-medium">← Back</Text>
            </TouchableOpacity>
          </HStack>
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

      {/* Content */}
      {loading ? (
        <Box className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#193867" />
        </Box>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#193867"
            />
          }
        >
          {logs.length === 0 ? (
            <Box className="items-center justify-center py-20">
              <Text className="text-typography-400 text-base">
                No system logs found
              </Text>
            </Box>
          ) : (
            <React.Fragment>
              <HtmlTable
                columns={LOG_TABLE_COLUMNS}
                data={logs}
                rowActions={LOG_ROW_ACTIONS}
                onRowAction={(action, rowId) => {
                  if (action === "view") {
                    const l = logs.find((x) => String(x._id) === String(rowId));
                    if (l) setSelectedLog(l);
                  }
                }}
                iconOnlyActions={true}
                tableContainerStyle={{ borderWidth: 0, shadowColor: "transparent", backgroundColor: "transparent", elevation: 0, marginHorizontal: 0, marginVertical: 0 }}
                headerRowStyle={{ backgroundColor: "#f8fafc", borderBottomWidth: 1.5, borderBottomColor: "#e2e8f0" }}
                headerCellTextStyle={{ color: "#1e3a8a", fontWeight: "700", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}
                rowStyle={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9", backgroundColor: "#ffffff" }}
              />

              {/* Pagination Controls */}
              {totalPages > 0 && (
                <Box style={styles.paginationWrapper}>
                  <HStack space="xs" className="items-center justify-center">
                    <TouchableOpacity
                      style={[styles.pageNavBtn, page === 1 && styles.pageNavBtnDisabled]}
                      disabled={page === 1}
                      onPress={() => {
                        if (page > 1) fetchLogs(page - 1, true);
                      }}
                    >
                      <Text style={[styles.pageNavText, page === 1 && styles.pageNavTextDisabled]}>‹</Text>
                    </TouchableOpacity>

                    {getPageNumbers(page, totalPages).map((p) => {
                      const isActive = p === page;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.pageNumberBtn, isActive && styles.pageNumberBtnActive]}
                          onPress={() => fetchLogs(p, true)}
                        >
                          <Text style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[styles.pageNavBtn, page >= totalPages && styles.pageNavBtnDisabled]}
                      disabled={page >= totalPages}
                      onPress={() => {
                        if (page < totalPages) fetchLogs(page + 1, true);
                      }}
                    >
                      <Text style={[styles.pageNavText, page >= totalPages && styles.pageNavTextDisabled]}>›</Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              )}
            </React.Fragment>
          )}
        </ScrollView>
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
            <Box style={styles.closeIconContainer}>
              <Heading size="md" className="">
                Log Details
              </Heading>
              <TouchableOpacity
                style={[styles.closeModalBtn]}
                onPress={() => setSelectedLog(null)}
              >
                <Feather name="x" size={20} color="#193867" />
              </TouchableOpacity>
            </Box>
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
  listContent: { padding: 16, paddingBottom: 90 },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  paginationWrapper: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  pageNavBtnDisabled: {
    backgroundColor: "#f8fafc",
    opacity: 0.5,
  },
  pageNavText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  pageNavTextDisabled: {
    color: "#94a3b8",
  },
  pageNumberBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  pageNumberBtnActive: {
    backgroundColor: "#2563eb",
  },
  pageNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  pageNumberTextActive: {
    color: "#ffffff",
  },
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
  closeIconContainer: {
    justifyContent: "space-between",
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12
  },
  closeModalBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
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
