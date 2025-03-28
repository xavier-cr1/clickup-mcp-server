/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Main Entry Point
 * 
 * This file serves as the main entry point for the TaskService.
 * It imports and combines the individual modules to create a unified TaskService class.
 */

import { TaskServiceCore } from './task-core.js';
import { TaskServiceSearch } from './task-search.js';

// Import other modules as they are implemented
// import { TaskServiceAttachments } from './task-attachments.js';
// import { TaskServiceComments } from './task-comments.js';

/**
 * TaskService class that combines functionality from all task-related modules
 */
export class TaskService extends TaskServiceSearch {
  // The inheritance chain ensures that all methods from the base classes are available
  // TaskServiceCore -> TaskServiceSearch -> TaskService
}

// Re-export types that might be useful for consumers
export * from '../types.js'; 