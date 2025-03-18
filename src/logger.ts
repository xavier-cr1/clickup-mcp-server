/**
 * Logger module for MCP Server
 * 
 * This module provides logging functionality for the server,
 * writing logs to both the console and a log file in the build folder.
 */

import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Current process ID for logging
const pid = process.pid;

// Create a write stream for logging - use a fixed filename in the build directory
const logFileName = 'server.log';
const logStream = createWriteStream(join(__dirname, logFileName), { flags: 'w' });
console.error(`Logging to ${join(__dirname, logFileName)}`);

// Log levels with numeric values for filtering
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

// Fixed log level - always use TRACE as the minimum level for complete logging
const configuredLevel = LogLevel.TRACE;

/**
 * Check if a log level is enabled based on the configured level
 * @param level The log level to check
 * @returns True if the level should be logged
 */
export function isLevelEnabled(level: LogLevel): boolean {
  return level >= configuredLevel;
}

/**
 * Log function that writes to both console and file
 * @param level Log level (trace, debug, info, warn, error)
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function log(level: 'trace' | 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
  const levelEnum = level === 'trace' ? LogLevel.TRACE 
    : level === 'debug' ? LogLevel.DEBUG
    : level === 'info' ? LogLevel.INFO
    : level === 'warn' ? LogLevel.WARN 
    : LogLevel.ERROR;
  
  // Skip if level is below configured level
  if (!isLevelEnabled(levelEnum)) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [PID:${pid}] ${level.toUpperCase()}: ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;

  // When using stdio transport, log to stderr which is captured by host application
  console.error(logMessage);

  // Write to file
  logStream.write(logMessage + '\n');
}

/**
 * Shorthand for trace level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function trace(message: string, data?: any) {
  log('trace', message, data);
}

/**
 * Shorthand for debug level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function debug(message: string, data?: any) {
  log('debug', message, data);
}

/**
 * Shorthand for info level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function info(message: string, data?: any) {
  log('info', message, data);
}

/**
 * Shorthand for warn level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function warn(message: string, data?: any) {
  log('warn', message, data);
}

/**
 * Shorthand for error level logs
 * @param message Message to log
 * @param data Optional data to include in log
 */
export function error(message: string, data?: any) {
  log('error', message, data);
}

/**
 * Logger class for creating context-specific loggers
 */
export class Logger {
  private context: string;

  /**
   * Create a new logger with context
   * @param context The context to prepend to log messages
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Check if a log level is enabled for this logger
   * @param level The level to check
   * @returns True if logging at this level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return isLevelEnabled(level);
  }

  /**
   * Log at trace level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  trace(message: string, data?: any) {
    log('trace', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at debug level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  debug(message: string, data?: any) {
    log('debug', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at info level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  info(message: string, data?: any) {
    log('info', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at warn level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  warn(message: string, data?: any) {
    log('warn', `[${this.context}] ${message}`, data);
  }

  /**
   * Log at error level
   * @param message Message to log
   * @param data Optional data to include in log
   */
  error(message: string, data?: any) {
    log('error', `[${this.context}] ${message}`, data);
  }
}

// Handle SIGTERM for clean shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM signal, shutting down...');
  logStream.end(() => {
    process.exit(0);
  });
}); 