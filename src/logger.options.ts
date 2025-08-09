import * as dotenv from 'dotenv';
import { LoggerOptions, LogLevel } from '@twg-group/nestjs-logger';
import { toBoolean } from './helpers';
import process from 'process';

dotenv.config();

const debug = toBoolean(process?.env?.DEBUG);
const logLevels: LogLevel[] = ['log', 'info', 'warn', 'error'];
if (debug) {
  logLevels.push('debug');
}

export const loggerOptions: LoggerOptions = {
  prefix: 'test',
  id: '',
  logLevels,
};
