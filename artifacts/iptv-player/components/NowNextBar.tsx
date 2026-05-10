import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { EPGProgram, useIPTV } from "@/context/IPTVContext";
import { useColors } from "@/hooks/useColors";

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDur(start: number, end: number) {
  const m = Math.round((end - start) / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ""}`.trim();
}

function progressPct(prog: EPGProgram) {
  return Math.min(1, Math.max(0, (Date.now() - prog.startTime) / (prog.endTime - prog.startTime)));
}

interface NowNextBarProps {
  onPlay: () => void;
}

export function NowNextBar({ onPlay }: NowNextBarProps) {
  const colors = useColors();
  const { selectedChannel, activePlaylist, stalkerEpgData } = useIPTV();

  const epg: EPGProgram[] = useMemo(() => {
    if (!selectedChannel) return [];
    if (activePlaylist?.type === "StalkerPortal" && stalkerEpgData[selectedChannel.id]?.length) {
      return stalkerEpgData[selectedChannel.id];
    }
    return selectedChannel.epg ?? [];
  }, [selectedChannel, activePlaylist, stalkerEpgData]);

  const now = Date.now();
  const current = useMemo(() => epg.find((p) => p.startTime <= now && p.endTime >= now), [epg]);
  const next = useMemo(() => epg.filter((p) => p.startTime > now).sort((a, b) => a.startTime - b.startTime)[0], [epg]);

  if (!selectedChannel || (!current && !next)) return null;

  const pct = current ? progressPct(current) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Channel identity strip */}
      <View style={[styles.channelStrip, { borderBottomColor: colors.border }]}>
        <View style={[styles.logoWrap, { backgroundColor: colors.secondary }]}>
          {selectedChannel.logo ? (
            <Image source={{ uri: selectedChannel.logo }} style={styles.logo} contentFit="contain" />
          ) : (
            <Feather name="tv" size={14} color={colors.mutedForeground} />
          )}
        </View>
        <Text style={[styles.channelName, { color: colors.mutedForeground }]} numberOfLines={1}>
          {selectedChannel.name}
        </Text>
        <Text style={[styles.groupName, { color: colors.mutedForeground }]} numberOfLines={1}>
          · {selectedChannel.group}
        </Text>
        <TouchableOpacity
          onPress={onPlay}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Feather name="play" size={12} color="#fff" />
          <Text style={styles.playBtnText}>Watch</Text>
        </TouchableOpacity>
      </View>

      {/* Now + Next panels */}
      <View style={styles.panels}>
        {/* NOW */}
        <View style={[styles.panel, styles.nowPanel, { borderRightColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <View style={styles.nowDot} />
            <Text style={[styles.panelLabel, { color: colors.primary }]}>NOW</Text>
            {current && (
              <Text style={[styles.panelTime, { color: colors.mutedForeground }]}>
                {fmt(current.startTime)} — {fmt(current.endTime)}
              </Text>
            )}
          </View>
          {current ? (
            <>
              <Text style={[styles.programTitle, { color: colors.foreground }]} numberOfLines={2}>
                {current.title}
              </Text>
              {current.description ? (
                <Text style={[styles.programDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {current.description}
                </Text>
              ) : null}
              <View style={[styles.progressTrack, { backgroundColor: colors.progressBg }]}>
                <View
                  style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct * 100}%` as any }]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                {fmtDur(current.startTime, current.endTime)} · {Math.round(pct * 100)}% done
              </Text>
            </>
          ) : (
            <Text style={[styles.noProgram, { color: colors.mutedForeground }]}>No info</Text>
          )}
        </View>

        {/* NEXT */}
        <View style={[styles.panel, styles.nextPanel]}>
          <View style={styles.panelHeader}>
            <Feather name="skip-forward" size={10} color={colors.mutedForeground} />
            <Text style={[styles.panelLabel, { color: colors.mutedForeground }]}>NEXT</Text>
            {next && (
              <Text style={[styles.panelTime, { color: colors.mutedForeground }]}>
                {fmt(next.startTime)}
              </Text>
            )}
          </View>
          {next ? (
            <>
              <Text style={[styles.programTitle, { color: colors.foreground }]} numberOfLines={2}>
                {next.title}
              </Text>
              {next.description ? (
                <Text style={[styles.programDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {next.description}
                </Text>
              ) : null}
              <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                Starts in {fmtDur(Date.now(), next.startTime)} · {fmtDur(next.startTime, next.endTime)}
              </Text>
            </>
          ) : (
            <Text style={[styles.noProgram, { color: colors.mutedForeground }]}>No info</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  channelStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: {
    width: 28,
    height: 20,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logo: { width: 28, height: 20 },
  channelName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    flexShrink: 1,
  },
  groupName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
    flex: 1,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  playBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  panels: {
    flexDirection: "row",
  },
  panel: {
    flex: 1,
    padding: 10,
    gap: 4,
  },
  nowPanel: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  nextPanel: {},
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  nowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4caf50",
  },
  panelLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  panelTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginLeft: "auto",
  },
  programTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
  },
  programDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 14,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
  noProgram: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
