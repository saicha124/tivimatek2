import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { EPGProgram } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = SCREEN_H * 0.62;

function formatHHMM(ms: number) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDuration(ms: number) {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const GENERIC_PROGRAMS = [
  "Morning News", "Breakfast Show", "Talk Show", "Documentary", "Sports Center",
  "Prime Time News", "Drama Series", "Reality TV", "Late Night Show", "Movie Premiere",
  "Comedy Hour", "Science & Nature", "World News", "Kids Corner", "Music Hits",
  "Crime Thriller", "Live Sports", "Cooking Show", "Travel Channel", "Tech Talk",
  "Business Today", "Health & Fitness", "Game Show", "Cartoon Network", "Movie Classic",
];

function generateFakeEpg(channelName: string, count = 12): EPGProgram[] {
  const now = Date.now();
  const slotSize = 30 * 60 * 1000;
  const startOffset = Math.floor(now / slotSize) * slotSize - slotSize * 4;

  const seed = channelName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const programs: EPGProgram[] = [];

  for (let i = 0; i < count; i++) {
    const slots = (i % 3 === 0) ? 2 : 1;
    const start = startOffset + programs.reduce((a, p) => a + (p.endTime - p.startTime), 0);
    const end = start + slots * slotSize;
    const nameIdx = (seed + i * 7) % GENERIC_PROGRAMS.length;
    programs.push({
      title: GENERIC_PROGRAMS[nameIdx],
      description: `Tune in for ${GENERIC_PROGRAMS[nameIdx]} on ${channelName}. An engaging episode with new content and exclusive coverage.`,
      startTime: start,
      endTime: end,
    });
  }
  return programs;
}

interface EpgOverlayProps {
  visible: boolean;
  channelName: string;
  channelGroup?: string;
  epgData?: EPGProgram[];
  onClose: () => void;
  onCatchUp?: (program: EPGProgram) => void;
}

export function EpgOverlay({
  visible,
  channelName,
  channelGroup,
  epgData,
  onClose,
  onCatchUp,
}: EpgOverlayProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_H,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const programs = useMemo(
    () => epgData && epgData.length > 0 ? epgData : generateFakeEpg(channelName),
    [epgData, channelName]
  );

  const currentIdx = useMemo(() => {
    const idx = programs.findIndex((p) => p.startTime <= now && p.endTime > now);
    return idx >= 0 ? idx : 0;
  }, [programs, now]);

  const current = programs[currentIdx];
  const upcoming = programs.slice(currentIdx + 1);

  const progress =
    current
      ? Math.min(1, Math.max(0, (now - current.startTime) / (current.endTime - current.startTime)))
      : 0;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120) {
          Animated.timing(slideAnim, {
            toValue: SHEET_H,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: "#111214", transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.dragArea}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="calendar" size={15} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: "#fff" }]}>TV Guide</Text>
            <View style={[styles.channelBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.channelBadgeText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {channelName}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        {/* Current Program */}
        {current && (
          <View style={[styles.nowCard, { backgroundColor: "#1a1d21", borderColor: `${colors.primary}40` }]}>
            <View style={styles.nowBadgeRow}>
              <View style={[styles.nowBadge, { backgroundColor: colors.primary }]}>
                <View style={styles.nowDot} />
                <Text style={styles.nowBadgeText}>NOW</Text>
              </View>
              <Text style={[styles.nowTime, { color: "rgba(255,255,255,0.55)" }]}>
                {formatHHMM(current.startTime)} – {formatHHMM(current.endTime)}
              </Text>
              <Text style={[styles.nowDuration, { color: "rgba(255,255,255,0.4)" }]}>
                {formatDuration(current.endTime - current.startTime)}
              </Text>
            </View>

            <Text style={[styles.nowTitle, { color: "#fff" }]} numberOfLines={2}>
              {current.title}
            </Text>

            {current.description && (
              <Text style={[styles.nowDesc, { color: "rgba(255,255,255,0.5)" }]} numberOfLines={2}>
                {current.description}
              </Text>
            )}

            {/* Progress bar */}
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBg, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` as any, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: "rgba(255,255,255,0.4)" }]}>
                {Math.round((1 - progress) * (current.endTime - current.startTime) / 60000)} min left
              </Text>
            </View>
          </View>
        )}

        {/* Upcoming Programs */}
        <View style={styles.upNextHeader}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.upNextLabel, { color: colors.mutedForeground }]}>UPCOMING</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {upcoming.map((prog, idx) => {
            const isPast = prog.endTime < now;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.progRow,
                  { borderBottomColor: "rgba(255,255,255,0.06)" },
                  isPast && { opacity: 0.4 },
                ]}
                onPress={() => {
                  if (isPast && onCatchUp) {
                    Haptics.selectionAsync();
                    onCatchUp(prog);
                  }
                }}
                activeOpacity={0.75}
              >
                <View style={styles.progTimeCol}>
                  <Text style={[styles.progTime, { color: colors.primary }]}>
                    {formatHHMM(prog.startTime)}
                  </Text>
                  <Text style={[styles.progDur, { color: "rgba(255,255,255,0.3)" }]}>
                    {formatDuration(prog.endTime - prog.startTime)}
                  </Text>
                </View>
                <View style={styles.progInfoCol}>
                  <Text style={[styles.progTitle, { color: "#fff" }]} numberOfLines={1}>
                    {prog.title}
                  </Text>
                  {prog.description && (
                    <Text style={[styles.progDesc, { color: "rgba(255,255,255,0.4)" }]} numberOfLines={1}>
                      {prog.description}
                    </Text>
                  )}
                </View>
                <View style={styles.progActions}>
                  {isPast ? (
                    <View style={[styles.catchUpTag, { borderColor: `${colors.primary}60` }]}>
                      <Feather name="rotate-ccw" size={10} color={colors.primary} />
                      <Text style={[styles.catchUpText, { color: colors.primary }]}>Catch-up</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.remindBtn, { borderColor: "rgba(255,255,255,0.15)" }]}
                      onPress={() => Haptics.selectionAsync()}
                    >
                      <Feather name="bell" size={12} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {upcoming.length === 0 && (
            <View style={styles.emptyUpcoming}>
              <Text style={[styles.emptyText, { color: "rgba(255,255,255,0.3)" }]}>No upcoming programs</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 160,
  },
  channelBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  nowCard: {
    marginHorizontal: 14,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  nowBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  nowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#fff",
  },
  nowBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  nowTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  nowDuration: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginLeft: "auto",
  },
  nowTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  nowDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginBottom: 10,
  },
  progressWrapper: {
    gap: 4,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  upNextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  upNextLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  progRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  progTimeCol: {
    width: 70,
    gap: 2,
  },
  progTime: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  progDur: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  progInfoCol: {
    flex: 1,
    gap: 2,
  },
  progTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  progDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  progActions: {
    justifyContent: "center",
  },
  catchUpTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  catchUpText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  remindBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyUpcoming: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
