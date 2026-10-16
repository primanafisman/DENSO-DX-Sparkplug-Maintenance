import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'node:path';
const forbidden=/password|authorization|cookie|token|secret|bytes|image|evidence|stack/i;
export function redact(value){if(Array.isArray(value))return value.map(redact);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,forbidden.test(key)?'[REDACTED]':redact(v)]));return value;}
export function createLogger(config){return winston.createLogger({level:'info',format:winston.format.combine(winston.format(info=>redact(info))(),winston.format.timestamp(),winston.format.json()),transports:[new DailyRotateFile({dirname:path.join(config.runtimeDir,'logs'),filename:'api-%DATE%.log',maxSize:'10m',maxFiles:'7d'})]});}
