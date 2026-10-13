import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  id: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    scannedAt: string;
    fullName?: string | null;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

export type StudentEventStatus = 'open' | 'upcoming' | 'closed';

export type StudentEventPreview = {
  id: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  status: StudentEventStatus;
};

export type StudentDashboardData = {
  totalAttended: number;
  presentCount: number;
  lateCount: number;
  attendanceRate: number;
  eligibleEvents: number;
  upcomingEvents: StudentEventPreview[];
  recentRecords: AttendanceRecord[];
  unreadNotificationCount: number;
};

function getEventStatus(startTime: string | null, endTime: string | null): StudentEventStatus {
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

export async function getStudentDashboardData(
  studentId: string
): Promise<StudentDashboardData> {
  const [attendanceResult, eventsResult] = await Promise.all([
    supabase
      .from('attendance')
      .select(
        `id,
         event_id,
         scanned_at,
         events (
           id,
           event_code,
           title,
           start_time,
           end_time
         )`
      )
      .eq('student_id', studentId)
      .order('scanned_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, event_code, title, start_time, end_time')
      .order('start_time', { ascending: true })
  ]);

  const attendanceRows = attendanceResult.data ?? [];
  const eventRows = eventsResult.data ?? [];

  const recentRecords: AttendanceRecord[] = attendanceRows.map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.events?.title ?? row.event_id,
    scannedAt: row.scanned_at,
  }));

  const totalAttended = new Set(recentRecords.map((record) => record.eventId)).size;
  const presentCount = totalAttended;
  const lateCount = 0;

  const eligibleEvents = eventRows.filter((event: any) => {
    if (!event.start_time) {
      return false;
    }

    const start = new Date(event.start_time).getTime();
    const end = event.end_time ? new Date(event.end_time).getTime() : null;
    const now = Date.now();

    if (start <= now && (!end || end >= now)) {
      return true;
    }

    return !!end && end <= now;
  }).length;

  const attendanceRate = eligibleEvents === 0 ? 0 : Math.min(100, Math.round((totalAttended / eligibleEvents) * 100));

  const upcomingEvents: StudentEventPreview[] = eventRows
    .filter((event: any) => !!event.start_time)
    .map((event: any) => ({
      id: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      status: getEventStatus(event.start_time, event.end_time),
    }))
    .filter((event) => event.status === 'open' || event.status === 'upcoming')
    .slice(0, 3);

  return {
    totalAttended,
    presentCount,
    lateCount,
    attendanceRate,
    eligibleEvents,
    upcomingEvents,
    recentRecords: recentRecords.slice(0, 5),
    unreadNotificationCount: 0,
  };
}

export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);

  if (!parsed.ok) {
    return {
      success: false,
      message: parsed.message,
    };
  }

  const payload = parsed.payload;
  const now = Date.now();

  const start = payload.start
    ? new Date(payload.start).getTime()
    : null;

  const end = payload.end
    ? new Date(payload.end).getTime()
    : null;

  if (start !== null && now < start) {
    return {
      success: false,
      message: 'Event has not started yet.',
    };
  }

  if (end !== null && now > end) {
    return {
      success: false,
      message: 'Event has already ended.',
    };
  }

  const title = payload.title ?? payload.event;

  let event: {
    id: string;
    title: string;
  } | null = null;

  const { data: foundEvent, error: lookupError } = await supabase
    .from('events')
    .select('id, title')
    .eq('event_code', payload.event)
    .maybeSingle();

  if (lookupError) {
    console.error('Failed to look up event:', lookupError);
    return {
      success: false,
      message: 'Could not look up event.',
    };
  }

  if (foundEvent) {
    event = {
      id: foundEvent.id,
      title: foundEvent.title,
    };
  } else {
    const {
      data: newEvent,
      error: insertError,
    } = await supabase
      .from('events')
      .insert([
        {
          event_code: payload.event,
          title,
          start_time: payload.start ?? null,
          end_time: payload.end ?? null,
        },
      ])
      .select('id, title')
      .single();

    if (insertError || !newEvent) {
      console.error(
        'Failed to create event:',
        insertError
      );

      return {
        success: false,
        message: 'Could not create event.',
      };
    }

    event = newEvent;
  }

  const { error: attendanceError } =
    await supabase
      .from('attendance')
      .insert([
        {
          student_id: studentId,
          event_id: event.id,
        },
      ]);

  if (attendanceError) {
    if (attendanceError.code === '23505') {
      return {
        success: false,
        message: 'Already registered for this event.',
        eventTitle: event.title,
      };
    }

    console.error(
      'Failed to record attendance:',
      attendanceError
    );

    return {
      success: false,
      message: attendanceError.message,
      eventTitle: event.title,
    };
  }

  return {
    success: true,
    message: 'Attendance recorded!',
    eventTitle: event.title,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const {
    data,
    error,
  } = await supabase
    .from('attendance')
    .select(`
      id,
      event_id,
      scanned_at,
      events (
        title
      )
    `)
    .eq('student_id', studentId)
    .order('scanned_at', {
      ascending: false,
    });

  if (error || !data) {
    console.error(
      'Failed to load attendance history:',
      error
    );

    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    eventTitle:
      row.events?.title ?? row.event_id,
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select(
      'id, event_code, title, start_time, end_time'
    )
    .eq('created_by', teacherId)
    .order('created_at', {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      'Failed to load teacher events:',
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from('attendance')
    .select(
      'student_id, scanned_at, event_id'
    )
    .in('event_id', eventIds)
    .order('scanned_at', {
      ascending: false,
    });

  if (attendanceError || !attendance) {
    console.error(
      'Failed to load teacher attendance:',
      attendanceError
    );

    return events.map((event) => ({
      eventId: event.id,
      id: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: 0,
      attendees: [],
    }));
  }

  return events.map((event) => {
    const rows = attendance.filter(
      (row) => row.event_id === event.id
    );

    return {
      eventId: event.id,
      id: event.id,
      eventCode: event.event_code,
      title: event.title,
      startTime: event.start_time,
      endTime: event.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((row) => ({
        studentId: row.student_id,
        scannedAt: row.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const {
    data: events,
    error: eventError,
  } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', {
      ascending: false,
    });

  if (eventError || !events) {
    console.error(
      'Failed to load teacher event summary:',
      eventError
    );

    return [];
  }

  const eventIds = events.map(
    (event) => event.id
  );

  if (eventIds.length === 0) {
    return [];
  }

  const {
    data: attRows,
    error: attError,
  } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  if (attError || !attRows) {
    console.error(
      'Failed to load attendance counts:',
      attError
    );

    return events.map((event) => ({
      eventId: event.id,
      eventCode: event.event_code,
      title: event.title,
      attendeeCount: 0,
    }));
  }

  const counts: Record<string, number> = {};

  attRows.forEach((row) => {
    counts[row.event_id] =
      (counts[row.event_id] ?? 0) + 1;
  });

  return events.map((event) => ({
    eventId: event.id,
    eventCode: event.event_code,
    title: event.title,
    attendeeCount: counts[event.id] ?? 0,
  }));
}