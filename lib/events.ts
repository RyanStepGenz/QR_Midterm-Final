import { supabase } from '@/lib/supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
};

export type EventStatus = 'open' | 'upcoming' | 'closed';

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
};

export function getEventStatus(startTime: string | null, endTime: string | null): EventStatus {
  const now = Date.now();

  if (!startTime) {
    return 'closed';
  }

  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : null;

  if (start > now) {
    return 'upcoming';
  }

  if (end !== null && end < now) {
    return 'closed';
  }

  return 'open';
}

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('events').upsert(
    {
      event_code: event.eventId,
      title: event.title,
      start_time: event.start || null,
      end_time: event.end || null,
      created_by: user?.id ?? null,
    },
    { onConflict: 'event_code' }
  );

  return { error: error?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getUpcomingEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as CloudEvent[]).filter((event) => !!event.start_time);
}

export async function getEventById(id: string): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}