import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  status: 'open' | 'upcoming' | 'closed';
  onPress?: () => void;
};

const statusColors = {
  open: { bg: '#E8F5E9', text: '#2E7D32' },
  upcoming: { bg: '#E3F2FD', text: COLORS.primary },
  closed: { bg: '#F5F5F5', text: '#616161' },
} as const;

export default function EventCard({
  title,
  dateLabel,
  timeLabel,
  status,
  onPress,
}: Props) {
  const colors = statusColors[status];

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.pill, { backgroundColor: colors.bg }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>
            {status === 'open' ? 'Open' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.metaText}>{dateLabel}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.metaText}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
});
