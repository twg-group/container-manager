import { LoggerOptions, LogLevel } from '@twg-group/nestjs-logger';
import { toBoolean } from '../helpers';
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const debug = toBoolean(process.env.DEBUG);
const logLevels: LogLevel[] = ['log', 'info', 'warn', 'error'];
if (debug) {
  logLevels.push('debug');
}

export const loggerOptions: LoggerOptions = {
  logLevels,
  jsonFormat: process.env.NODE_ENV === 'production',
};
