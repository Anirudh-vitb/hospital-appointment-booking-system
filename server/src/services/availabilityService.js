import Appointment from '../models/Appointment.js';
import AvailabilityException from '../models/AvailabilityException.js';
import { BOOKING_RULES } from '../config/hospital.js';
import ApiError from '../utils/ApiError.js';
import { dayOfWeek, hhmmOf, minutesOf, nowInZone, parseLocalDate, toInstant } from '../utils/time.js';

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// Checks that a date is inside the booking window (today … today + N days).
export function assertBookableDate(isoDate, now = nowInZone()) {
  const day = parseLocalDate(isoDate);
  if (!day) throw ApiError.badRequest('Choose a valid date.');
  const today = now.startOf('day');
  if (day < today) {
    throw new ApiError(400, 'DATE_IN_PAST', 'Appointments cannot be booked for a date that has already passed.');
  }
  if (day > today.plus({ days: BOOKING_RULES.maxDaysAhead })) {
    throw new ApiError(400, 'DATE_TOO_FAR', `Appointments open ${BOOKING_RULES.maxDaysAhead} days in advance. Choose an earlier date.`);
  }
  return day;
}

// Splits weekly schedule blocks into fixed-length slots, e.g. 09:00–10:00 at
// 15 minutes gives 09:00, 09:15, 09:30, 09:45.
export function buildSlots(blocks, slotMinutes) {
  const slots = [];
  for (const block of blocks) {
    const end = minutesOf(block.end);
    for (let start = minutesOf(block.start); start + slotMinutes <= end; start += slotMinutes) {
      slots.push({ start, end: start + slotMinutes });
    }
  }
  return slots.sort((a, b) => a.start - b.start);
}

// Pure function that labels each slot. Kept separate from database access so
// the rules can be unit-tested directly.
export function labelSlots({ slots, exceptions, booked, isoDate, now }) {
  const earliest = now.plus({ minutes: BOOKING_RULES.minLeadMinutes });
  return slots.map(({ start, end }) => {
    let status = 'available';
    if (toInstant(isoDate, hhmmOf(start)) < earliest) {
      status = 'past';
    } else if (
      exceptions.some((ex) => !ex.start || overlaps(start, end, minutesOf(ex.start), minutesOf(ex.end)))
    ) {
      status = 'blocked';
    } else if (booked.some((b) => overlaps(start, end, minutesOf(b.startTime), minutesOf(b.endTime)))) {
      status = 'booked';
    }
    return { start: hhmmOf(start), end: hhmmOf(end), status };
  });
}

// Calculates the slots for one doctor on one date. The response only says
// whether a slot is free — never who booked it.
export async function getDaySlots(doctor, isoDate, { now = nowInZone() } = {}) {
  const day = assertBookableDate(isoDate, now);
  const weekday = dayOfWeek(day);
  const blocks = doctor.weeklySchedule.filter((block) => block.dayOfWeek === weekday);

  if (!doctor.isActive || blocks.length === 0) {
    return { date: isoDate, isWorkingDay: false, blockedAllDay: false, slots: [] };
  }

  const [exceptions, booked] = await Promise.all([
    AvailabilityException.find({ doctor: doctor._id, date: isoDate }).lean(),
    Appointment.find({ doctor: doctor._id, date: isoDate, holdsSlot: true }, 'startTime endTime').lean(),
  ]);

  const slots = labelSlots({
    slots: buildSlots(blocks, doctor.slotMinutes),
    exceptions,
    booked,
    isoDate,
    now,
  });

  return {
    date: isoDate,
    isWorkingDay: true,
    blockedAllDay: exceptions.some((ex) => !ex.start),
    blockReason: exceptions.find((ex) => !ex.start)?.reason || undefined,
    slots,
  };
}

export function validateSchedule(blocks) {
  const byDay = new Map();
  for (const block of blocks) {
    if (minutesOf(block.start) >= minutesOf(block.end)) {
      throw ApiError.badRequest(`A block on day ${block.dayOfWeek} ends before it starts (${block.start}–${block.end}).`);
    }
    const list = byDay.get(block.dayOfWeek) || [];
    for (const other of list) {
      if (overlaps(minutesOf(block.start), minutesOf(block.end), minutesOf(other.start), minutesOf(other.end))) {
        throw ApiError.badRequest(`Two working blocks overlap on the same day (${other.start}–${other.end} and ${block.start}–${block.end}).`);
      }
    }
    list.push(block);
    byDay.set(block.dayOfWeek, list);
  }
}
