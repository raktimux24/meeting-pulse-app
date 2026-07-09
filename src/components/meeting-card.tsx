import { Clock3, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, formatSigned } from './ui';
import { MEETING_TYPE_LABELS, MOOD_CONFIG, REASON_MAP } from '@/domain/constants';
import type { Meeting } from '@/domain/types';
import { colors, fonts, radius, spacing } from '@/theme/tokens';

export function MeetingCard({ meeting, onPress }: { meeting: Meeting; onPress: () => void }) {
  const positive = meeting.impactScore > 0;
  const neutral = meeting.impactScore === 0;
  const accent = positive ? colors.moss : neutral ? colors.amber : colors.wine;
  const background = positive ? colors.mossSoft : neutral ? colors.amberSoft : colors.wineSoft;
  const primaryReason = meeting.reasonIds[0] ? REASON_MAP[meeting.reasonIds[0]].label : MOOD_CONFIG[meeting.mood].short;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meeting.title}, ${MOOD_CONFIG[meeting.mood].label}, ${meeting.impactScore >= 0 ? 'positive' : 'negative'} ${Math.abs(meeting.impactScore)} impact`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient colors={positive ? ['rgba(25,58,51,0.82)', 'rgba(17,24,39,0.94)'] : neutral ? ['rgba(58,48,32,0.72)', 'rgba(17,24,39,0.94)'] : ['rgba(59,32,41,0.82)', 'rgba(17,24,39,0.94)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="title" numberOfLines={1}>{meeting.title}</AppText>
            <AppText variant="small" style={{ color: colors.inkSoft }}>{MEETING_TYPE_LABELS[meeting.meetingType]} · {MOOD_CONFIG[meeting.mood].label}</AppText>
          </View>
          <View style={[styles.score, { backgroundColor: background, borderColor: accent }]}> 
            <AppText variant="title" style={{ color: accent, fontFamily: fonts.bodyBold }}>{formatSigned(meeting.impactScore)}</AppText>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.meta}><Clock3 size={14} color={colors.inkSoft} /><AppText variant="small" style={styles.metaText}>{meeting.durationMinutes} min</AppText></View>
          <View style={styles.meta}><Users size={14} color={colors.inkSoft} /><AppText variant="small" style={styles.metaText}>{meeting.peopleCount}</AppText></View>
          <View style={styles.reason}><AppText variant="small" style={{ color: accent }} numberOfLines={1}>{primaryReason}</AppText></View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 132, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 18, elevation: 5 },
  rail: { width: 5 },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  topRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  score: { minWidth: 58, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: colors.inkSoft },
  reason: { flex: 1, alignItems: 'flex-end' },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
