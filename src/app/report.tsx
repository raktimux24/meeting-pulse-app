import { endOfWeek, format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { Share2, ShieldCheck } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, formatSigned, Screen } from '@/components/ui';
import { MEETING_TYPE_LABELS, REASON_MAP } from '@/domain/constants';
import { summarizeWeek } from '@/domain/insights';
import type { Meeting } from '@/domain/types';
import { useAppData } from '@/providers/app-data-provider';
import { colors, fonts, gradients, radius, spacing } from '@/theme/tokens';

export default function ReportScreen() {
  const { start: startParam } = useLocalSearchParams<{ start: string }>();
  const { getRange, weekStartsOn } = useAppData();
  const start = useMemo(() => new Date(startParam), [startParam]);
  const end = useMemo(() => endOfWeek(start, { weekStartsOn }), [start, weekStartsOn]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const reportRef = useRef<View>(null);

  useEffect(() => { getRange(start, end).then(setMeetings).finally(() => setLoaded(true)); }, [end, getRange, start]);
  const summary = useMemo(() => summarizeWeek(meetings, start, end), [end, meetings, start]);
  const tone = summary.weeklyPulse > 0 ? colors.moss : summary.weeklyPulse < 0 ? colors.wine : colors.amber;
  const recommendation = summary.insights[0]?.body ?? 'Keep logging to reveal a pattern worth changing.';

  const share = async () => {
    if (!reportRef.current || sharing) return;
    setSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot open the system share sheet. Your report preview is still here.');
        return;
      }
      const uri = await captureRef(reportRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share my Meeting Pulse', UTI: 'public.png' });
    } catch {
      Alert.alert('Could not share', 'The report preview is still here. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen topSafe={false}>
      <View style={styles.intro}><AppText variant="label" style={{ color: colors.orange }}>Privacy-safe preview</AppText><AppText variant="display">Your meeting week, distilled.</AppText><AppText style={{ color: colors.inkSoft }}>No meeting names, notes, or attendee details appear on this card.</AppText></View>

      <View ref={reportRef} collapsable={false} style={styles.report}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.reportHeader}>
          <View style={styles.brandMark}><View style={styles.brandDot} /></View>
          <View style={{ flex: 1 }}><AppText variant="label">Meeting Pulse</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{format(start, 'MMM d')} — {format(end, 'MMM d, yyyy')}</AppText></View>
          <AppText variant="small" style={{ color: colors.inkSoft }}>MY WEEK</AppText>
        </View>

        <LinearGradient colors={summary.weeklyPulse >= 0 ? gradients.positive : gradients.negative} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreBand}>
          <View pointerEvents="none" style={[styles.scoreGlow, { backgroundColor: tone, shadowColor: tone }]} />
          <View><AppText variant="label" style={{ color: colors.white, opacity: 0.75 }}>Mood balance</AppText><AppText style={styles.reportScore}>{formatSigned(summary.weeklyPulse)}</AppText></View>
          <View style={styles.classification}><AppText variant="title" style={{ color: colors.white, textAlign: 'right' }}>{summary.classification}</AppText></View>
        </LinearGradient>

        <View style={styles.statRow}>
          <ReportStat value={`${summary.meetingCount}`} label="Meetings" />
          <ReportStat value={`${(summary.totalMinutes / 60).toFixed(1)}h`} label="In calls" />
          <ReportStat value={`${summary.positiveCount}/${summary.negativeCount}`} label="Return / cost" />
        </View>

        <View style={styles.reportBody}>
          <ReportLine label="Most useful" value={summary.mostUsefulType ? MEETING_TYPE_LABELS[summary.mostUsefulType] : 'No clear leader'} />
          <ReportLine label="Most draining" value={summary.mostDrainingType ? MEETING_TYPE_LABELS[summary.mostDrainingType] : 'No clear drag'} />
          <ReportLine label="Top issue" value={summary.topNegativeReason ? REASON_MAP[summary.topNegativeReason].label : 'None repeated'} />
        </View>

        <View style={styles.fixBlock}>
          <AppText variant="label" style={{ color: colors.orange }}>One fix for next week</AppText>
          <AppText variant="title">{recommendation}</AppText>
        </View>

        <View style={styles.reportFooter}><ShieldCheck size={16} color={colors.moss} /><AppText variant="small" style={{ color: colors.inkSoft }}>Private reflection · Shared without meeting details</AppText></View>
      </View>

      <Button label="Share report as image" onPress={share} loading={sharing} disabled={!loaded} icon={<Share2 size={19} color={colors.white} />} />
    </Screen>
  );
}

function ReportStat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><AppText variant="display">{value}</AppText><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText></View>;
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.reportLine}><AppText variant="small" style={{ color: colors.inkSoft }}>{label}</AppText><AppText variant="title" style={{ textAlign: 'right', flex: 1 }}>{value}</AppText></View>;
}

const styles = StyleSheet.create({
  intro: { gap: 5 },
  report: { borderWidth: 1, borderColor: colors.lineDark, borderRadius: radius.lg, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.38, shadowRadius: 26, elevation: 10 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.lg },
  brandMark: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  scoreBand: { minHeight: 160, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  scoreGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.11, right: -45, top: -45, shadowOpacity: 0.9, shadowRadius: 65 },
  reportScore: { color: colors.white, fontFamily: fonts.display, fontSize: 62, lineHeight: 66 },
  classification: { maxWidth: '48%' },
  statRow: { flexDirection: 'row', padding: spacing.lg, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  stat: { flex: 1, gap: 2 },
  reportBody: { padding: spacing.lg, gap: spacing.md },
  reportLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  fixBlock: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: colors.orangeSoft, borderRadius: radius.md, gap: 7 },
  reportFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
