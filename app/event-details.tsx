import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { getEventById, getEventStatus, type CloudEvent } from '@/lib/events';

function formatDateLabel(iso: string | null): string {
  if (!iso) {
    return 'Date not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
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

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const [event, setEvent] = useState<CloudEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      const found = await getEventById(eventId);
      setEvent(found);
      setLoading(false);
    };

    void load();
  }, [eventId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Loading event details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.title}>Event not found</Text>
          <Text style={styles.muted}>This event could not be loaded.</Text>
          <AppButton title="Back to events" icon="arrow-back-outline" onPress={() => router.push('/events')} />
        </View>
      </SafeAreaView>
    );
  }

  const status = getEventStatus(event.start_time, event.end_time);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>School activity</Text>
        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.statusWrap}>
          <Text style={[styles.status, status === 'open' ? styles.statusOpen : status === 'upcoming' ? styles.statusUpcoming : styles.statusClosed]}>
            {status === 'open' ? 'Open for attendance' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{formatDateLabel(event.start_time)}</Text>

          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{formatTimeLabel(event.start_time, event.end_time)}</Text>

          <Text style={styles.label}>Event code</Text>
          <Text style={styles.value}>{event.event_code}</Text>

          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>No additional event description was added for this activity.</Text>

          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>Location not specified.</Text>
        </View>

        <AppButton
          theme="primary"
          title={status === 'open' ? 'Open QR Scanner' : 'Back to events'}
          icon={status === 'open' ? 'qr-code-outline' : 'arrow-back-outline'}
          onPress={() => {
            if (status === 'open') {
              router.push('/scan');
              return;
            }

            router.push('/events');
          }}
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  statusWrap: {
    marginBottom: 20,
  },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: '700',
    fontSize: 12,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusUpcoming: {
    backgroundColor: '#E3F2FD',
    color: COLORS.primary,
  },
  statusClosed: {
    backgroundColor: '#F5F5F5',
    color: '#616161',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  muted: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
});
