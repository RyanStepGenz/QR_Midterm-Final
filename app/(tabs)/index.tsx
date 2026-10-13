import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { getStudentDashboardData, type StudentDashboardData } from '@/lib/attendance';

function formatDateLabel(iso: string | null): string {
  if (!iso) {
    return 'Date not set';
  }

  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTimeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) {
    return 'Time not set';
  }

  const start = new Date(startTime);
  const formattedStart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  if (!endTime) {
    return formattedStart;
  }

  const end = new Date(endTime);
  const formattedEnd = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end);

  return `${formattedStart} - ${formattedEnd}`;
}

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState('Student');
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setDashboard(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [profile, data] = await Promise.all([
        getProfile(user.id),
        getStudentDashboardData(user.id),
      ]);

      setProfileName(profile?.full_name?.trim() || 'Student');
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setDashboard({
        totalAttended: 0,
        presentCount: 0,
        lateCount: 0,
        attendanceRate: 0,
        eligibleEvents: 0,
        upcomingEvents: [],
        recentRecords: [],
        unreadNotificationCount: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const greeting = profileName.split(' ')[0] || 'Student';
  const stats = dashboard ?? {
    totalAttended: 0,
    presentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
    eligibleEvents: 0,
    upcomingEvents: [],
    recentRecords: [],
    unreadNotificationCount: 0,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Header title="QR Attendance" />
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/history')}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>{stats.unreadNotificationCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadDashboard(); }} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>Hi, {greeting}</Text>
          <Text style={styles.subtleText}>Here’s your attendance overview</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>Loading your dashboard…</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Events attended"
                value={String(stats.totalAttended)}
                caption="Confirmed checks"
                icon="checkmark-circle-outline"
                accent="success"
              />
              <StatCard
                label="Attendance rate"
                value={`${stats.attendanceRate}%`}
                caption={`${stats.eligibleEvents} eligible events`}
                icon="trending-up-outline"
                accent="primary"
              />
              <StatCard
                label="Present"
                value={String(stats.presentCount)}
                caption="On time or marked present"
                icon="person-outline"
                accent="success"
              />
              <StatCard
                label="Late"
                value={String(stats.lateCount)}
                caption="Late attendance"
                icon="time-outline"
                accent="warning"
              />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              <Text style={styles.linkText} onPress={() => router.push('/events')}>View all</Text>
            </View>

            {stats.upcomingEvents.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>No upcoming events yet.</Text>
              </View>
            ) : (
              stats.upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  dateLabel={formatDateLabel(event.startTime)}
                  timeLabel={formatTimeLabel(event.startTime, event.endTime)}
                  status={event.status}
                  onPress={() => router.push({ pathname: '/event-details', params: { eventId: event.id } })}
                />
              ))
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent attendance</Text>
              <Text style={styles.linkText}>History</Text>
            </View>

            {stats.recentRecords.length === 0 ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateText}>No attendance yet. Scan a QR code to get started.</Text>
              </View>
            ) : (
              stats.recentRecords.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <Text style={styles.recordTitle}>{record.eventTitle}</Text>
                  <Text style={styles.recordMeta}>{formatDateLabel(record.scannedAt)}</Text>
                </View>
              ))
            )}
          </>
        )}

        <View style={styles.footerContainer}>
          <AppButton
            theme="primary"
            title="Scan QR Code"
            icon="qr-code-outline"
            onPress={() => router.push('/scan')}
          />
          <AppButton
            title="Attendance History"
            icon="time-outline"
            onPress={() => router.push('/history')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    position: 'relative',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  notificationButton: {
    position: 'absolute',
    right: 24,
    top: 36,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeWrap: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  greetingRow: {
    marginTop: 8,
    marginBottom: 18,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtleText: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  stateCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  recordCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recordTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerContainer: {
    marginTop: 16,
  },
});