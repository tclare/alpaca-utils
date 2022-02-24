import { formatInTimeZone } from 'date-fns-tz';
import { getCurrentDate } from '../services/date-service';

export default class Logger {

  getCurrentTimeFormatted(): string {
    return formatInTimeZone(getCurrentDate(), 'America/New_York', 'hh:mm:ss zz');
  }

  getFunctionNameWithEllipsis(name: string) {
    const spaces = Array(35 - name.length).join('.');
    return `${name}${spaces}`;
  }

  info(...args: any[]) {
    console.info(`[INFO][${this.getFunctionNameWithEllipsis(args[0])}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
  warn(...args: any[]) {
    console.warn(`[WARN][${this.getFunctionNameWithEllipsis(args[0])}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
  error(...args: any[]) {
    console.error(`[ERRO][${this.getFunctionNameWithEllipsis(args[0])}][${this.getCurrentTimeFormatted()}]`, ...args.slice(1));
  }
}
