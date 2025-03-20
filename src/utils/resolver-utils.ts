/**
 * Resolver Utility Functions
 * 
 * This module provides utilities for resolving entity IDs from names or other identifiers.
 */

import { clickUpServices } from '../services/shared.js';
import { findListIDByName } from '../tools/list.js';

/**
 * Resolve a list ID from either a direct ID or list name
 * 
 * @param listId Optional direct list ID
 * @param listName Optional list name to resolve
 * @param workspaceService Workspace service to use for lookup
 * @returns Resolved list ID
 * @throws Error if neither listId nor listName is provided, or if list name can't be resolved
 */
export async function resolveListId(
  listId?: string,
  listName?: string,
  workspaceService = clickUpServices.workspace
): Promise<string> {
  // If list ID is directly provided, use it
  if (listId) {
    return listId;
  }
  
  // If list name is provided, find the corresponding ID
  if (listName) {
    const listInfo = await findListIDByName(workspaceService, listName);
    if (!listInfo) {
      throw new Error(`List "${listName}" not found`);
    }
    return listInfo.id;
  }
  
  // If neither is provided, throw an error
  throw new Error("Either listId or listName must be provided");
}

/**
 * Resolve a task ID from either a direct ID or task name + list info
 * 
 * @param taskId Optional direct task ID
 * @param taskName Optional task name to resolve
 * @param listId Optional list ID for task lookup
 * @param listName Optional list name for task lookup
 * @param taskService Task service to use for lookup
 * @returns Resolved task ID
 * @throws Error if parameters are insufficient or task can't be found
 */
export async function resolveTaskId(
  taskId?: string,
  taskName?: string,
  listId?: string,
  listName?: string,
  taskService = clickUpServices.task
): Promise<string> {
  // If task ID is directly provided, use it
  if (taskId) {
    return taskId;
  }
  
  // If task name is provided, we need list info to find it
  if (taskName) {
    // We need either listId or listName to find a task by name
    if (!listId && !listName) {
      throw new Error(`List name or ID is required when using task name for task "${taskName}"`);
    }
    
    // Get list ID
    const targetListId = await resolveListId(listId, listName);
    
    // Find the task in the list
    const foundTask = await taskService.findTaskByName(targetListId, taskName);
    if (!foundTask) {
      throw new Error(`Task "${taskName}" not found in list`);
    }
    
    return foundTask.id;
  }
  
  // If neither is provided, throw an error
  throw new Error("Either taskId or taskName must be provided");
} 