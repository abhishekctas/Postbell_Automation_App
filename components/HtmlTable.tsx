import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableData,
} from '@/components/ui/table';
import { Pencil, Trash2, Info, Eye, XCircle } from 'lucide-react-native';

export interface HtmlTableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: T) => string | React.ReactNode;
}

interface HtmlTableProps {
  columns: HtmlTableColumn[];
  data: any[];
  rowActions?: { label: string; action: string; style?: string }[];
  onRowAction?: (action: string, rowId: string) => void;
  tableContainerStyle?: any;
  headerRowStyle?: any;
  headerCellTextStyle?: any;
  headerCellStyle?: any;
  rowStyle?: any;
  rowEvenStyle?: any;
  rowOddStyle?: any;
  cellStyle?: any;
  iconOnlyActions?: boolean;
}

// Simple HTML/span stripper and parser to native React Native components
function renderCellContent(value: any) {
  if (value === null || value === undefined) {
    return <Text style={styles.emptyText}>—</Text>;
  }

  if (React.isValidElement(value)) {
    return value;
  }

  const str = String(value);

  // Check if it's a styled span from custom renderers (e.g. status badge)
  if (str.includes('<span') || str.includes('<div')) {
    const bgMatch = str.match(/background:\s*(#[0-9a-fA-F]+|[a-zA-Z0-9() ,.#]+)/);
    const colorMatch = str.match(/color:\s*(#[0-9a-fA-F]+|[a-zA-Z0-9() ,.#]+)/);
    const textMatch = str.match(/>([^<]+)<\//);

    const bg = bgMatch ? bgMatch[1] : undefined;
    const color = colorMatch ? colorMatch[1] : undefined;
    const text = textMatch ? textMatch[1] : str.replace(/<[^>]*>/g, '');

    return (
      <View style={[styles.badge, bg ? { backgroundColor: bg } : styles.badgeDefaultBg]}>
        <Text style={[styles.badgeText, color ? { color: color } : styles.badgeDefaultColor]}>
          {text}
        </Text>
      </View>
    );
  }

  // Strip any other HTML tags safely
  if (str.includes('<')) {
    const text = str.replace(/<[^>]*>/g, '');
    return <Text style={styles.cellText}>{text}</Text>;
  }

  return <Text style={styles.cellText}>{str}</Text>;
}

export default function HtmlTable({
  columns,
  data,
  rowActions,
  onRowAction,
  tableContainerStyle,
  headerRowStyle,
  headerCellTextStyle,
  headerCellStyle,
  rowStyle,
  rowEvenStyle,
  rowOddStyle,
  cellStyle,
  iconOnlyActions = false,
}: HtmlTableProps) {
  const hasActions = rowActions && rowActions.length > 0;
  const actionColWidth = iconOnlyActions ? 100 : 180;

  // Calculate suitable table width based on columns and their defined widths
  const totalTableWidth = columns.reduce(
    (acc, col) => {
      const w = col.width ? parseInt(col.width, 10) : 150;
      return acc + w;
    },
    hasActions ? actionColWidth : 0
  );

  const tableMinWidth = Math.max(totalTableWidth, 750);

  return (
    <View style={[styles.cardContainer, tableContainerStyle]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollView}>
        <View style={{ minWidth: tableMinWidth }}>
          <Table style={{ width: '100%' }}>
            <TableHeader style={styles.tableHeader}>
              <TableRow style={[styles.headerRow, headerRowStyle]}>
                {columns.map((col) => {
                  const width = col.width ? parseInt(col.width, 10) : 150;
                  return (
                    <TableHead
                      key={col.key}
                      useRNView={true}
                      style={[styles.headerCell, headerCellStyle, { width }]}
                    >
                      <Text style={[styles.headerCellText, headerCellTextStyle]}>{col.label}</Text>
                    </TableHead>
                  );
                })}
                {hasActions && (
                  <TableHead
                    useRNView={true}
                    style={[styles.headerCell, headerCellStyle, { width: actionColWidth }]}
                  >
                    <Text style={[styles.headerCellText, headerCellTextStyle]}>Actions</Text>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableData useRNView={true} style={[styles.noDataCell, { width: tableMinWidth }]}>
                    <View style={styles.noDataContainer}>
                      <Info size={28} color="#94a3b8" />
                      <Text style={styles.noDataText}>No records found</Text>
                    </View>
                  </TableData>
                </TableRow>
              ) : (
                data.map((row, idx) => {
                  const rowId = row._id || row.id || idx;
                  const isEven = idx % 2 === 0;

                  return (
                    <TableRow
                      key={rowId}
                      style={[
                        styles.row,
                        rowStyle,
                        isEven ? [styles.rowEven, rowEvenStyle] : [styles.rowOdd, rowOddStyle],
                      ]}
                    >
                      {columns.map((col) => {
                        const width = col.width ? parseInt(col.width, 10) : 150;
                        let value = row[col.key];
                        if (col.render) {
                          value = col.render(value, row);
                        }

                        return (
                          <TableData
                            key={col.key}
                            useRNView={true}
                            style={[styles.cell, cellStyle, { width }]}
                          >
                            {renderCellContent(value)}
                          </TableData>
                        );
                      })}

                      {hasActions && (
                        <TableData
                          useRNView={true}
                          style={[styles.cell, cellStyle, { width: actionColWidth }]}
                        >
                          <View style={styles.actionsContainer}>
                            {rowActions.map((actionInfo) => {
                              const isDanger = actionInfo.style === 'danger';
                              return (
                                <TouchableOpacity
                                  key={actionInfo.action}
                                  style={[
                                    styles.actionBtn,
                                    isDanger ? styles.actionBtnDanger : styles.actionBtnNormal,
                                    iconOnlyActions && {
                                      width: 32,
                                      height: 32,
                                      paddingHorizontal: 0,
                                      paddingVertical: 0,
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      borderRadius: 8,
                                    },
                                  ]}
                                  onPress={() => {
                                    if (onRowAction) {
                                      onRowAction(actionInfo.action, String(rowId));
                                    }
                                  }}
                                >
                                  {actionInfo.action === 'edit' ? (
                                    <Pencil
                                      size={14}
                                      color={isDanger ? '#dc2626' : '#2563eb'}
                                      style={!iconOnlyActions && { marginRight: 4 }}
                                    />
                                  ) : actionInfo.action === 'delete' ? (
                                    <Trash2
                                      size={14}
                                      color="#dc2626"
                                      style={!iconOnlyActions && { marginRight: 4 }}
                                    />
                                  ) : actionInfo.action === 'view' ||
                                    actionInfo.action === 'details' ? (
                                    <Eye
                                      size={14}
                                      color={isDanger ? '#dc2626' : '#2563eb'}
                                      style={!iconOnlyActions && { marginRight: 4 }}
                                    />
                                  ) : actionInfo.action === 'cancel' ? (
                                    <XCircle
                                      size={14}
                                      color={isDanger ? '#dc2626' : '#2563eb'}
                                      style={!iconOnlyActions && { marginRight: 4 }}
                                    />
                                  ) : null}
                                  {!iconOnlyActions && (
                                    <Text
                                      style={[
                                        styles.actionBtnText,
                                        isDanger
                                          ? styles.actionBtnTextDanger
                                          : styles.actionBtnTextNormal,
                                      ]}
                                    >
                                      {actionInfo.label}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </TableData>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    marginHorizontal: 2,
    marginVertical: 12,
  },
  scrollView: {
    width: '100%',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#795a9010', // Soft purple tint matching the primary-700 color: 121 90 144
  },
  headerCell: {
    paddingVertical: 0,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b416d', // Rich deep purple theme matching primary color
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: '#ffffff',
  },
  rowOdd: {
    backgroundColor: '#fbfafd', // Alternating soft tint
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeDefaultBg: {
    backgroundColor: '#eff6ff',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDefaultColor: {
    color: '#1d4ed8',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
  },
  actionBtnNormal: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  actionBtnDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnTextNormal: {
    color: '#4f46e5',
  },
  actionBtnTextDanger: {
    color: '#dc2626',
  },
  noDataCell: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
