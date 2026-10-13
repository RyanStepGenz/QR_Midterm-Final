import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';

type Props = {
  label: string;
  value: string;
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: 'primary' | 'success' | 'warning';
};

export default function StatCard({
  label,
  value,
  caption,
  icon,
  accent = 'primary',
}: Props) {
  const accentColors = {
    primary: { bg: '#E3F2FD', icon: COLORS.primary },
    success: { bg: '#E8F5E9', icon: '#2E7D32' },
    warning: { bg: '#FFF8E1', icon: '#F9A825' },
  } as const;

  const colors = accentColors[accent];

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={20} color={colors.icon} />
      </View>

      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
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
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  value: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  caption: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
