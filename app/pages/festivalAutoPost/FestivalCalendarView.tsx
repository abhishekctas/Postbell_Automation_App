import React, { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Feather } from '@expo/vector-icons';
import type { FestivalGeneratedPost } from './festival-auto-post.api';
import { getFestivalImageUrl } from './festival-auto-post.api';
import { getEventColor } from './festivalColors';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  addYears,
  isSameMonth,
  isToday,
  isPastDay,
  startOfYear,
  buildDateKey,
  formatMonthYear,
  formatYear,
  formatMonthName,
  formatDayHeader,
} from './festival-auto-post.dateUtils';

export type CalendarMode = 'monthly' | 'yearly';

interface FestivalCalendarViewProps {
  posts: FestivalGeneratedPost[];
  onEditPost: (post: FestivalGeneratedPost) => void;
  onCreateAtDate?: (date?: Date | null) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MAX_VISIBLE_EVENTS = 3;

/* ------------------------------------------------------------------ */
/*  Event Bar helper & component                                      */
/* ------------------------------------------------------------------ */

const getCalendarEventStyle = (post: FestivalGeneratedPost) => {
  const c = getEventColor(post.category, post.name);
  const deactive = post.selectedFestival === false;

  if (!deactive) {
    return {
      main: c.main,
      dark: c.dark,
      contrastText: '#ffffff',
      border: c.main,
      bg: `${c.main}25`,
    };
  }

  return {
    main: `${c.main}30`,
    dark: `${c.dark}40`,
    contrastText: '#64748b',
    border: `${c.main}50`,
    bg: `${c.main}15`,
  };
};

function EventBar({
  post,
  onClick,
  compact = true,
}: {
  post: FestivalGeneratedPost;
  onClick: () => void;
  compact?: boolean;
}) {
  const c = getCalendarEventStyle(post);
  const deactive = post.selectedFestival === false;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onClick}
      style={[
        styles.eventBar,
        {
          backgroundColor: c.main,
          paddingVertical: compact ? 2 : 4,
          paddingHorizontal: compact ? 4 : 6,
        },
      ]}
    >
      <Text
        style={[
          styles.eventBarText,
          {
            color: deactive ? '#64748b' : '#ffffff',
            fontSize: compact ? 10 : 11.5,
          },
        ]}
        numberOfLines={1}
      >
        {post.name}
      </Text>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Bar Component                                               */
/* ------------------------------------------------------------------ */

interface StatsBarProps {
  stats: { total: number; selected: number; upcoming: number };
}

function StatsBar({ stats }: StatsBarProps) {
  const items: {
    label: string;
    value: number;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    bgColor: string;
    iconBgColor: string;
    borderColor: string;
  }[] = [
    {
      label: 'TOTAL EVENTS',
      value: stats.total,
      icon: 'calendar',
      color: '#2563EB',
      bgColor: '#F6FAFF',
      iconBgColor: '#E1EFFF',
      borderColor: '#E0EEFD',
    },
    {
      label: 'ACTIVE',
      value: stats.selected,
      icon: 'check-circle',
      color: '#16A34A',
      bgColor: '#F4FBF6',
      iconBgColor: '#E1F8EA',
      borderColor: '#DAF5E4',
    },
    {
      label: 'UPCOMING',
      value: stats.upcoming,
      icon: 'clock',
      color: '#EA580C',
      bgColor: '#FEFAF3',
      iconBgColor: '#FEF1DC',
      borderColor: '#FDEBD0',
    },
  ];

  return (
    <HStack style={styles.statsContainer} space="md">
      {items.map((item) => (
        <Box
          key={item.label}
          style={[
            styles.statCard,
            {
              backgroundColor: item.bgColor,
              borderColor: item.borderColor,
            },
          ]}
        >
          <Box style={[styles.statIconWrap, { backgroundColor: item.iconBgColor }]}>
            <Feather name={item.icon} size={16} color={item.color} />
          </Box>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
        </Box>
      ))}
    </HStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Monthly Calendar Component                                        */
/* ------------------------------------------------------------------ */

interface MonthlyCalendarProps {
  monthDate: Date;
  getPostsOnDate: (date: Date) => FestivalGeneratedPost[];
  onDayClick: (date: Date) => void;
  onEditPost: (post: FestivalGeneratedPost) => void;
  onCreateAtDate?: (date?: Date | null) => void;
}

function MonthlyCalendar({
  monthDate,
  getPostsOnDate,
  onDayClick,
  onEditPost,
  onCreateAtDate,
}: MonthlyCalendarProps) {
  const start = startOfWeek(startOfMonth(monthDate));
  const end = endOfWeek(endOfMonth(monthDate));
  const days = eachDayOfInterval({ start, end });

  return (
    <Box style={styles.monthCalendarCard}>
      {/* Weekday header row */}
      <HStack style={styles.weekdayHeaderRow}>
        {WEEKDAYS.map((day, idx) => (
          <Box key={day} style={[styles.weekdayHeaderCell, idx === 6 && { borderRightWidth: 0 }]}>
            <Text style={styles.weekdayHeaderText}>{day}</Text>
          </Box>
        ))}
      </HStack>

      {/* Days Grid */}
      <View style={styles.monthGrid}>
        {days.map((day, idx) => {
          const events = getPostsOnDate(day);
          const inMonth = isSameMonth(day, monthDate);
          const today = Boolean(isToday(day));
          const canCreate = Boolean(onCreateAtDate) && inMonth && !isPastDay(day);
          const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
          const overflowCount = events.length - MAX_VISIBLE_EVENTS;
          const isRightCol = (idx + 1) % 7 === 0;

          return (
            <TouchableOpacity
              key={day.toISOString()}
              activeOpacity={0.7}
              onPress={() => {
                if (events.length > 1) {
                  onDayClick(day);
                } else if (events.length === 1) {
                  onEditPost(events[0]);
                } else if (canCreate) {
                  onCreateAtDate?.(day);
                }
              }}
              style={[
                styles.dayCell,
                isRightCol && { borderRightWidth: 0 },
                !inMonth && styles.dayCellOutside,
                today && styles.dayCellToday,
              ]}
            >
              {/* Day number badge */}
              <Box style={styles.dayNumWrap}>
                <Box style={[styles.dayNumCircle, today && styles.dayNumCircleToday]}>
                  <Text
                    style={[
                      styles.dayNumText,
                      today && styles.dayNumTextToday,
                      !inMonth && styles.dayNumTextOutside,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Box>
              </Box>

              {/* Event bars */}
              <VStack style={styles.eventBarsContainer} space="xs">
                {visibleEvents.map((post) => (
                  <EventBar key={post.id} post={post} onClick={() => onEditPost(post)} compact />
                ))}
                {overflowCount > 0 && (
                  <TouchableOpacity onPress={() => onDayClick(day)}>
                    <Text style={styles.overflowText}>+{overflowCount} more</Text>
                  </TouchableOpacity>
                )}
              </VStack>
            </TouchableOpacity>
          );
        })}
      </View>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Yearly Calendar Component                                         */
/* ------------------------------------------------------------------ */

interface YearlyCalendarProps {
  yearDate: Date;
  getPostsOnDate: (date: Date) => FestivalGeneratedPost[];
  onMonthSelect: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onCreateAtDate?: (date?: Date | null) => void;
}

function YearlyCalendar({
  yearDate,
  getPostsOnDate,
  onMonthSelect,
  onDayClick,
  onCreateAtDate,
}: YearlyCalendarProps) {
  const yearStart = startOfYear(yearDate);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  return (
    <View style={styles.yearlyGrid}>
      {months.map((mDate) => {
        const mStart = startOfWeek(startOfMonth(mDate));
        const mEnd = endOfWeek(endOfMonth(mDate));
        const days = eachDayOfInterval({ start: mStart, end: mEnd });

        let monthEventCount = 0;
        days.forEach((d) => {
          if (isSameMonth(d, mDate)) {
            monthEventCount += getPostsOnDate(d).length;
          }
        });

        return (
          <Box key={mDate.toISOString()} style={styles.yearMonthCard}>
            {/* Month Header */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onMonthSelect(mDate)}
              style={styles.yearMonthHeader}
            >
              <Text style={styles.yearMonthTitle}>{formatMonthName(mDate)}</Text>
              {monthEventCount > 0 && (
                <Box style={styles.yearMonthCountBadge}>
                  <Text style={styles.yearMonthCountText}>{monthEventCount}</Text>
                </Box>
              )}
            </TouchableOpacity>

            {/* Mini Weekday row */}
            <HStack style={styles.miniWeekdayRow}>
              {WEEKDAYS_SHORT.map((wd) => (
                <Text key={wd} style={styles.miniWeekdayText}>
                  {wd}
                </Text>
              ))}
            </HStack>

            {/* Mini Day Grid */}
            <View style={styles.miniDayGrid}>
              {days.map((day) => {
                const events = getPostsOnDate(day);
                const inMonth = isSameMonth(day, mDate);
                const today = Boolean(isToday(day));
                const hasEvents = events.length > 0 && inMonth;
                const eventColor = hasEvents ? getCalendarEventStyle(events[0]) : null;

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    disabled={!inMonth}
                    onPress={() => {
                      if (hasEvents) {
                        onDayClick(day);
                      } else if (inMonth && onCreateAtDate && !isPastDay(day)) {
                        onCreateAtDate(day);
                      }
                    }}
                    style={[
                      styles.miniDayCell,
                      today && styles.miniDayToday,
                      hasEvents && eventColor ? { backgroundColor: eventColor.bg } : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniDayText,
                        !inMonth && styles.miniDayTextOutside,
                        today && styles.miniDayTextToday,
                        hasEvents && { fontWeight: '700' },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {hasEvents && !today && (
                      <Box
                        style={[
                          styles.miniEventDot,
                          { backgroundColor: eventColor ? eventColor.main : '#2563EB' },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Box>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main FestivalCalendarView Export                                  */
/* ------------------------------------------------------------------ */

export default function FestivalCalendarView({
  posts,
  onEditPost,
  onCreateAtDate,
}: FestivalCalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('monthly');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);

  const postsByDate = useMemo(() => {
    const map = new Map<string, FestivalGeneratedPost[]>();
    posts.forEach((post) => {
      if (!post.date) return;
      const d = new Date(post.date);
      if (Number.isNaN(d.getTime())) return;
      const key = buildDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return map;
  }, [posts]);

  const getPostsOnDate = (date: Date) => postsByDate.get(buildDateKey(date)) || [];

  const stats = useMemo(() => {
    let total = 0;
    let selected = 0;
    let upcoming = 0;
    const now = new Date();
    posts.forEach((p) => {
      total += 1;
      if (p.selectedFestival) selected += 1;
      if (p.date && new Date(p.date) >= now) upcoming += 1;
    });
    return { total, selected, upcoming };
  }, [posts]);

  const handleNavigate = (direction: -1 | 1) => {
    if (mode === 'yearly') {
      setCurrentDate((d) => addYears(d, direction));
    } else {
      setCurrentDate((d) => addMonths(d, direction));
    }
  };

  const handleDayClick = (date: Date) => {
    setDayModalDate(date);
  };

  const closeDayModal = () => {
    setDayModalDate(null);
  };

  const headerLabel = mode === 'yearly' ? formatYear(currentDate) : formatMonthYear(currentDate);

  const dayModalEvents = dayModalDate ? getPostsOnDate(dayModalDate) : [];

  return (
    <VStack space="md" style={{ width: '100%' }}>
      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Toolbar */}
      <Box style={styles.toolbarCard}>
        <HStack className="flex-wrap items-center justify-between">
          <HStack className="items-center" space="xs">
            <Text style={styles.toolbarTitle}>Calendar</Text>

            <TouchableOpacity onPress={() => handleNavigate(-1)} style={styles.navArrowBtn}>
              <Feather name="chevron-left" size={18} color="#193867" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleNavigate(1)} style={styles.navArrowBtn}>
              <Feather name="chevron-right" size={18} color="#193867" />
            </TouchableOpacity>

            <Text style={styles.headerDateLabel}>{headerLabel}</Text>

            <TouchableOpacity onPress={() => setCurrentDate(new Date())} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </HStack>

          {/* Mode Switcher */}
          <HStack style={styles.modeToggleWrap}>
            <TouchableOpacity
              onPress={() => setMode('monthly')}
              style={[styles.modeToggleBtn, mode === 'monthly' && styles.modeToggleBtnActive]}
            >
              <Text
                style={[styles.modeToggleText, mode === 'monthly' && styles.modeToggleTextActive]}
              >
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('yearly')}
              style={[styles.modeToggleBtn, mode === 'yearly' && styles.modeToggleBtnActive]}
            >
              <Text
                style={[styles.modeToggleText, mode === 'yearly' && styles.modeToggleTextActive]}
              >
                Year
              </Text>
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>

      {/* Calendar Grid View */}
      {mode === 'monthly' ? (
        <MonthlyCalendar
          monthDate={currentDate}
          getPostsOnDate={getPostsOnDate}
          onDayClick={handleDayClick}
          onEditPost={onEditPost}
          onCreateAtDate={onCreateAtDate}
        />
      ) : (
        <YearlyCalendar
          yearDate={currentDate}
          getPostsOnDate={getPostsOnDate}
          onMonthSelect={(date) => {
            setCurrentDate(date);
            setMode('monthly');
          }}
          onDayClick={handleDayClick}
          onCreateAtDate={onCreateAtDate}
        />
      )}

      {/* Day Events Modal */}
      <Modal
        visible={Boolean(dayModalDate)}
        transparent
        animationType="fade"
        onRequestClose={closeDayModal}
      >
        <TouchableOpacity activeOpacity={1} onPress={closeDayModal} style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} style={styles.dayModalCard}>
            {dayModalDate && (
              <VStack>
                {/* Modal Header */}
                <Box style={styles.dayModalHeader}>
                  <HStack className="items-center justify-between">
                    <VStack>
                      <Text style={styles.dayModalHeaderDate}>{formatDayHeader(dayModalDate)}</Text>
                      <Text style={styles.dayModalHeaderCount}>
                        {dayModalEvents.length} event
                        {dayModalEvents.length !== 1 ? 's' : ''}
                      </Text>
                    </VStack>
                    <TouchableOpacity onPress={closeDayModal} style={styles.dayModalCloseBtn}>
                      <Feather name="x" size={18} color="#64748b" />
                    </TouchableOpacity>
                  </HStack>
                </Box>

                {/* Event list */}
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  <VStack space="sm" style={{ padding: 14 }}>
                    {dayModalEvents.map((post) => {
                      const style = getCalendarEventStyle(post);
                      const deactive = post.selectedFestival === false;
                      const imageUrl = getFestivalImageUrl(post.image || post.image_url);

                      return (
                        <TouchableOpacity
                          key={post.id}
                          activeOpacity={0.8}
                          onPress={() => {
                            closeDayModal();
                            onEditPost(post);
                          }}
                          style={[
                            styles.dayEventItem,
                            {
                              borderLeftColor: style.border,
                              backgroundColor: deactive ? '#f8fafc' : style.main,
                            },
                          ]}
                        >
                          <HStack className="items-center" space="sm">
                            {imageUrl ? (
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.dayEventImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <Box
                                style={[
                                  styles.dayEventAvatar,
                                  { backgroundColor: deactive ? '#e2e8f0' : `${style.dark}` },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.dayEventAvatarText,
                                    { color: deactive ? '#64748b' : '#fff' },
                                  ]}
                                >
                                  {(post.name || 'F').charAt(0).toUpperCase()}
                                </Text>
                              </Box>
                            )}

                            <VStack style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={[
                                  styles.dayEventName,
                                  { color: deactive ? '#1e293b' : '#ffffff' },
                                ]}
                                numberOfLines={1}
                              >
                                {post.name}
                              </Text>
                              {post.category ? (
                                <Text
                                  style={[
                                    styles.dayEventCategory,
                                    { color: deactive ? '#64748b' : 'rgba(255,255,255,0.85)' },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {post.category}
                                </Text>
                              ) : null}
                            </VStack>

                            <Feather
                              name="chevron-right"
                              size={16}
                              color={deactive ? '#94a3b8' : '#ffffff'}
                            />
                          </HStack>
                        </TouchableOpacity>
                      );
                    })}
                  </VStack>
                </ScrollView>

                {/* Add Event Button */}
                {onCreateAtDate && (
                  <Box style={styles.dayModalFooter}>
                    <TouchableOpacity
                      onPress={() => {
                        const date = dayModalDate;
                        closeDayModal();
                        onCreateAtDate(date);
                      }}
                      style={styles.dayModalAddBtn}
                    >
                      <Feather name="plus" size={16} color="#2563EB" />
                      <Text style={styles.dayModalAddBtnText}>Add Event for this date</Text>
                    </TouchableOpacity>
                  </Box>
                )}
              </VStack>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </VStack>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    width: '100%',
    paddingHorizontal: 15,
    gap: 20,
  },
  statCard: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconWrap: {
    width: 35,
    height: 35,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  toolbarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 15,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 6,
  },
  navArrowBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 5,
    backgroundColor: '#f8fafc',
  },
  headerDateLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginHorizontal: 4,
  },
  todayBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#ffffff',
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  modeToggleWrap: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  modeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  modeToggleTextActive: {
    color: '#ffffff',
  },
  monthCalendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 40,
    marginHorizontal: 15,
  },
  weekdayHeaderRow: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  weekdayHeaderCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  weekdayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.3,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%', // 100% / 7 columns
    minHeight: 85,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    padding: 3,
    backgroundColor: '#ffffff',
  },
  dayCellOutside: {
    backgroundColor: '#f8fafc',
    opacity: 0.45,
  },
  dayCellToday: {
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  dayNumWrap: {
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  dayNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumCircleToday: {
    backgroundColor: '#2563EB',
  },
  dayNumText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  dayNumTextToday: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dayNumTextOutside: {
    color: '#94a3b8',
  },
  eventBarsContainer: {
    flex: 1,
  },
  eventBar: {
    borderRadius: 3,
    marginBottom: 2,
  },
  eventBarText: {
    fontWeight: '600',
  },
  overflowText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563EB',
    paddingHorizontal: 2,
  },
  yearlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 40,
    marginHorizontal: 15,
  },
  yearMonthCard: {
    width: Dimensions.get('window').width > 500 ? '48%' : '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    padding: 8,
  },
  yearMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 6,
  },
  yearMonthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  yearMonthCountBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  yearMonthCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  miniWeekdayRow: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  miniWeekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
  },
  miniDayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    position: 'relative',
  },
  miniDayToday: {
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },
  miniDayText: {
    fontSize: 9.5,
    color: '#334155',
    fontWeight: '500',
  },
  miniDayTextOutside: {
    color: '#cbd5e1',
  },
  miniDayTextToday: {
    color: '#ffffff',
    fontWeight: '800',
  },
  miniEventDot: {
    position: 'absolute',
    bottom: 2,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dayModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dayModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dayModalHeaderDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dayModalHeaderCount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  dayModalCloseBtn: {
    padding: 4,
  },
  dayEventItem: {
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 8,
  },
  dayEventAvatar: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEventImg: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  dayEventAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayEventName: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayEventCategory: {
    fontSize: 10.5,
    marginTop: 1,
  },
  dayModalFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dayModalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dayModalAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});
