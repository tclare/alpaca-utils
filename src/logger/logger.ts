import { formatInTimeZone } from 'date-fns-tz';
import { getCurrentDate } from '../services/date-service';

export class Logger {
  getCurrentTimeFormatted(): string {
    return formatInTimeZone(getCurrentDate(), 'America/New_York', 'hh:mm:ss zz');
  }

  getFunctionNameWithEllipsis(name: string) {
    const spaces = Array(25 - name.length).join('.');
    return `${name}${spaces}`;
  }

  info(...args: any[]) {
    this.log('INFO', ... args);
  }
  warn(...args: any[]) {
    this.log('WARN', ... args);
  }
  error(...args: any[]) {
    this.log('ERRO', ... args)
  }

  log(type: string, ...args: any) {
    args.map((arg: any, i: number) => {
      if (i === 0) process.stdout.write(`[${type}][${this.getFunctionNameWithEllipsis(arg)}][${this.getCurrentTimeFormatted()}]`)
      else process.stdout.write(` ${arg}`);
    });
    process.stdout.write('\n')
  }
}
