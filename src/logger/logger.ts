import { formatInTimeZone } from 'date-fns-tz';
import { getCurrentDate } from '../services/date-service';

export default class Logger {
  getCurrentTimeFormatted(): string {
    const curr = getCurrentDate();
    return formatInTimeZone(curr, 'America/New_York', 'hh:mm:ss zz');
  }

  info(...args: any[]) {
    console.info(`[INFO][${args[0]}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
  warn(...args: any[]) {
    console.warn(`[WARN][${args[0]}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
  error(...args: any[]) {
    console.error(`[ERRO][${args[0]}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
}
