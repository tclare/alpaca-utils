import { isPast, startOfToday, parse, subDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

export function getCurrentDate() {
  return utcToZonedTime(new Date(), 'America/New_York');
}

export function getStartOfToday() {
  return startOfToday();
}

export function getDateTodayFromTime(time: string): Date {
  return parse(time, 'h:mmaa', getCurrentDate());
}

export function getMOODatetimeToday() {
  return getDateTodayFromTime('9:30am');
}

export function getMOODatetimeNDaysAgo(n: number) {
  return subDays(getMOODatetimeToday(), n);
}

export function getMOCOrCurrentTime() {
  return isPast(getMOCDatetimeToday()) ? getMOCDatetimeToday() : getCurrentDate();
}

export function getMOCDatetimeToday() {
  return getDateTodayFromTime('4:00pm');
}

export function getMOCDatetimeNDaysAgo(n: number) {
  return subDays(getMOCDatetimeToday(), n);
}
