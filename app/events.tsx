import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppButton from '@/components/AppButton';
import EventCard from '@/components/EventCard';
import { COLORS } from '@/constants/colors';
import { getEventStatus, getUpcomingEvents, type CloudEvent, type EventStatus } from '@/lib/events';

function formatDateLabel(iso: string | null): string {
  if (!iso) {
    return 'Date not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatTimeLabel(startTime: string | null, endTime: string | null): string {
  if (!startTime) {
    return 'Time not set';
  }

  const start = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startTime));

  if (!endTime) {
    return start;
  }

  return `${start} - ${new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(endTime))}`;
}

export default function EventsScreen() {
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const nextEvents = await getUpcomingEvents();
    setEvents(nextEvents);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const cards = events.map((event) => ({
    ...event,
    status: getEventStatus(event.start_time, event.end_time) as EventStatus,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming events</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadEvents();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>Loading upcoming events…</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>There are no upcoming school events right now.</Text>
          </View>
        ) : (
          cards.map((event) => (
            <EventCard
              key={event.id}
              title={event.title}
              dateLabel={formatDateLabel(event.start_time)}
              timeLabel={formatTimeLabel(event.start_time, event.end_time)}
              status={event.status}
              onPress={() => router.push({ pathname: '/event-details', params: { eventId: event.id } })}
            />
          ))
        )}

        <AppButton
          theme="primary"
          title="Scan QR Code"
          icon="qr-code-outline"
          onPress={() => router.push('/scan')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
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
});
