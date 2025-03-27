/**
 * ClickUp MCP Task Utilities
 * 
 * This module provides utility functions for task-related operations including
 * data formatting, validation, and resolution of IDs from names.
 */

import { 
  ClickUpTask, 
  TaskPriority, 
  UpdateTaskData
} from '../../services/clickup/types.js';
import { BatchProcessingOptions } from '../../utils/concurrency-utils.js';
import { formatDueDate } from '../utils.js';
import { clickUpServices } from '../../services/shared.js';

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
    start_date: task.start_date,
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
 */
export function validateTaskIdentification(taskId?: string, taskName?: string, listName?: string, customTaskId?: string): void {
  if (!taskId && !taskName && !customTaskId) {
    throw new Error("Either taskId, customTaskId, or taskName must be provided");
  }
  
  if (!taskId && !customTaskId && taskName && !listName) {
    throw new Error("listName is required when using taskName");
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
export function validateTaskUpdateData(updateData: UpdateTaskData): void {
  const hasUpdates = Object.keys(updateData).length > 0;
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

//=============================================================================
// ID RESOLUTION UTILITIES
//=============================================================================

/**
 * Resolves a task ID from direct ID, custom ID, or name
 * Handles validation and throws appropriate errors
 */
export async function resolveTaskIdWithValidation(
  taskId?: string, 
  taskName?: string, 
  listName?: string,
  customTaskId?: string
): Promise<string> {
  // Validate parameters
  validateTaskIdentification(taskId, taskName, listName, customTaskId);
  
  // If customTaskId is explicitly provided, use it
  if (customTaskId) {
    const { task: taskService } = clickUpServices;
    try {
      // First try to get the task by custom ID
      // If listName is provided, we can also look up in a specific list for better performance
      let listId: string | undefined;
      if (listName) {
        listId = await resolveListIdWithValidation(undefined, listName);
      }
      
      // Look up by custom ID
      const foundTask = await taskService.getTaskByCustomId(customTaskId, listId);
      return foundTask.id;
    } catch (error) {
      throw new Error(`Task with custom ID "${customTaskId}" not found`);
    }
  }
  
  // If taskId is provided, check if it looks like a custom ID
  if (taskId) {
    if (isCustomTaskId(taskId)) {
      console.log(`Detected task ID "${taskId}" as a custom ID, using custom ID lookup`);
      // If it looks like a custom ID, try to get it as a custom ID first
      const { task: taskService } = clickUpServices;
      try {
        // Look up by custom ID
        let listId: string | undefined;
        if (listName) {
          listId = await resolveListIdWithValidation(undefined, listName);
        }
        
        const foundTask = await taskService.getTaskByCustomId(taskId, listId);
        return foundTask.id;
      } catch (error) {
        // If it fails as a custom ID, try as a regular ID
        console.log(`Failed to find task with custom ID "${taskId}", falling back to regular ID`);
        return taskId;
      }
    }
    
    // Regular task ID
    return taskId;
  }
  
  // At this point we know we have taskName and listName (validation ensures this)
  
  // Find the list ID from its name
  const listId = await resolveListIdWithValidation(undefined, listName!);
  
  // Find the task in the list
  const { task: taskService } = clickUpServices;
  const foundTask = await taskService.findTaskByName(listId, taskName!);
  
  if (!foundTask) {
    throw new Error(`Task "${taskName}" not found in list "${listName}"`);
  }
  
  return foundTask.id;
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
  
  // Find the list ID from its name
  const hierarchy = await workspaceService.getWorkspaceHierarchy();
  const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName!, 'list');
  
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