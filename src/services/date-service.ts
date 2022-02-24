import { isPast, startOfToday, parse, subDays } from 'date-fns';
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export function getCurrentDate() {
  return new Date();
}

export function getCurrentZonedDate() {
  return utcToZonedTime(getCurrentDate(), 'America/New_York');
}

export function formatCurrentDateInEst(format: string) {
  return formatInTimeZone(getCurrentDate(), 'America/New_York', format);
}

export function getStartOfToday() {
  return startOfToday();
}

export function parseTimeFromEst(time: string): Date {
  const extrapolatedDate = parse(time, 'h:mmaa', getCurrentZonedDate());
  return zonedTimeToUtc(extrapolatedDate, 'America/New_York');
}

export function getMOODatetimeToday() {
  return parseTimeFromEst('9:30am');
}

export function getMOODatetimeNDaysAgo(n: number) {
  return subDays(getMOODatetimeToday(), n);
}

export function getMOCOrCurrentTime() {
  return isPast(getMOCDatetimeToday()) ? getMOCDatetimeToday() : getCurrentDate();
}

export function getMOCDatetimeToday() {
  return parseTimeFromEst('4:00pm');
}

export function getMOCDatetimeNDaysAgo(n: number) {
  return subDays(getMOCDatetimeToday(), n);
}
