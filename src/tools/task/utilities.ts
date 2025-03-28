/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Task Utilities
 * 
 * This module provides utility functions for task-related operations including
 * data formatting, validation, and resolution of IDs from names.
 */

import { 
  ClickUpTask
} from '../../services/clickup/types.js';
import { BatchProcessingOptions } from '../../utils/concurrency-utils.js';
import { formatDueDate } from '../utils.js';
import { clickUpServices } from '../../services/shared.js';
import { findListIDByName } from '../../tools/list.js';

// Use shared services instance for ID resolution
const { workspace: workspaceService } = clickUpServices;

//=============================================================================
// DATA FORMATTING UTILITIES
//=============================================================================

/**
 * Formats task data for response
 */
export function formatTaskData(task: ClickUpTask, additional: any = {}) {
  return {
    id: task.id,
    custom_id: task.custom_id,
    name: task.name,
    text_content: task.text_content,
    description: task.description,
    url: task.url,
    status: task.status?.status || "Unknown",
    status_color: task.status?.color,
    orderindex: task.orderindex,
    date_created: task.date_created,
    date_updated: task.date_updated,
    date_closed: task.date_closed,
    creator: task.creator,
    assignees: task.assignees,
    watchers: task.watchers,
    checklists: task.checklists,
    tags: task.tags,
    parent: task.parent,
    priority: task.priority,
    due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
    start_date: task.start_date ? formatDueDate(Number(task.start_date)) : undefined,
    time_estimate: task.time_estimate,
    time_spent: task.time_spent,
    custom_fields: task.custom_fields,
    dependencies: task.dependencies,
    linked_tasks: task.linked_tasks,
    team_id: task.team_id,
    list: {
      id: task.list.id,
      name: task.list.name,
      access: task.list.access
    },
    folder: task.folder ? {
      id: task.folder.id,
      name: task.folder.name,
      hidden: task.folder.hidden,
      access: task.folder.access
    } : null,
    space: {
      id: task.space.id,
      name: task.space.name
    },
    ...additional
  };
}

//=============================================================================
// VALIDATION UTILITIES
//=============================================================================

/**
 * Validates task identification parameters
 * Ensures either taskId, customTaskId, or both taskName and listName are provided
 * When useGlobalLookup is true, allows taskName without listName
 */
export function validateTaskIdentification(
  taskId?: string, 
  taskName?: string, 
  listName?: string, 
  customTaskId?: string,
  useGlobalLookup = true
): void {
  if (!taskId && !taskName && !customTaskId) {
    throw new Error("Either taskId, customTaskId, or taskName must be provided");
  }
  
  // When global lookup is not enabled, we need list context for task name lookup
  if (!useGlobalLookup && !taskId && !customTaskId && taskName && !listName) {
    throw new Error("listName is required when using taskName and global lookup is disabled");
  }
}

/**
 * Validates list identification parameters
 * Ensures either listId or listName is provided
 */
export function validateListIdentification(listId?: string, listName?: string): void {
  if (!listId && !listName) {
    throw new Error("Either listId or listName must be provided");
  }
}

/**
 * Validates task update data
 * Ensures at least one update field is provided
 */
export function validateTaskUpdateData(updateData: any): void {
  // Check if there are any valid update fields present
  const hasUpdates = Object.keys(updateData).some(key => {
    return ['name', 'description', 'markdown_description', 'status', 'priority', 'dueDate', 'startDate', 'taskId', 'taskName'].includes(key);
  });
  
  if (!hasUpdates) {
    throw new Error("At least one field to update must be provided");
  }
}

/**
 * Validate bulk operation tasks array
 */
export function validateBulkTasks(tasks: any[]): void {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('You must provide a non-empty array of tasks');
  }
}

/**
 * Parse options for bulk operations
 */
export function parseBulkOptions(rawOptions: any): BatchProcessingOptions | undefined {
  if (typeof rawOptions === 'string') {
    try {
      return JSON.parse(rawOptions);
    } catch (error) {
      return undefined;
    }
  }
  return rawOptions;
}

//=============================================================================
// ID DETECTION UTILITIES
//=============================================================================

/**
 * Determines if an ID is a custom ID based on its format
 * Custom IDs typically have an uppercase prefix followed by a hyphen and number (e.g., DEV-1234)
 * Regular task IDs are always 9 characters long
 * 
 * @param id The task ID to check
 * @returns True if the ID appears to be a custom ID
 */
export function isCustomTaskId(id: string): boolean {
  if (!id) return false;
  
  // Regular task IDs are exactly 9 characters
  if (id.length === 9) {
    return false;
  }
  
  // Custom IDs have an uppercase prefix followed by a hyphen and numbers
  const customIdPattern = /^[A-Z]+-\d+$/;
  return customIdPattern.test(id);
}

/**
 * Resolves a list ID from either direct ID or name
 * Handles validation and throws appropriate errors
 */
export async function resolveListIdWithValidation(listId?: string, listName?: string): Promise<string> {
  // Validate parameters
  validateListIdentification(listId, listName);
  
  // If listId is provided, use it directly
  if (listId) return listId;
  
  // At this point we know we have listName (validation ensures this)
  const listInfo = await findListIDByName(workspaceService, listName!);
  
  if (!listInfo) {
    throw new Error(`List "${listName}" not found`);
  }
  
  return listInfo.id;
}

//=============================================================================
// PATH EXTRACTION HELPER FUNCTIONS
//=============================================================================

/**
 * Extract path from node to root
 */
export function extractPath(node: any): string {
  if (!node) return '';
  if (!node.parent) return node.name;
  return `${extractPath(node.parent)} > ${node.name}`;
}

/**
 * Extract path from root to a specific node
 */
export function extractTreePath(root: any, targetId: string): any[] {
  if (!root) return [];
  
  // If this node is the target, return it in an array
  if (root.id === targetId) {
    return [root];
  }
  
  // Check children if they exist
  if (root.children) {
    for (const child of root.children) {
      const path = extractTreePath(child, targetId);
      if (path.length > 0) {
        return [root, ...path];
      }
    }
  }
  
  // Not found in this branch
  return [];
} 