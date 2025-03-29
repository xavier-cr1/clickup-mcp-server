/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service
 * 
 * Main entry point for the ClickUp Task Service.
 * Combines all task-related functionality through inheritance:
 * - Core operations (CRUD)
 * - Search capabilities
 * - File attachments
 * - Comments
 * - Tags
 * - Custom fields
 */

import { TaskServiceCustomFields } from './task-custom-fields.js';
import { WorkspaceService } from '../workspace.js';

/**
 * Complete TaskService combining all task-related functionality
 */
export class TaskService extends TaskServiceCustomFields {
  constructor(
    apiKey: string,
    teamId: string,
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl, workspaceService);
    this.logOperation('constructor', { initialized: true });
  }
} 