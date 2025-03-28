/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * Resolver Utility Functions
 * 
 * This module provides utilities for resolving entity IDs from names or other identifiers.
 */

import { clickUpServices } from '../services/shared.js';
import { findListIDByName } from '../tools/list.js';

/**
 * Check if a task name matches search criteria
 * 
 * Performs flexible case-insensitive and emoji-aware text matching
 * Used by multiple components for consistent name matching behavior
 */
export function isNameMatch(taskName: string, searchTerm: string): boolean {
  const normalizedTask = taskName.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  // Handle empty strings - don't match empty task names
  if (normalizedTask === '') return false;
  if (normalizedSearch === '') return false;
  
  // Exact match check
  if (normalizedTask === normalizedSearch) return true;
  
  // Substring match check
  if (normalizedTask.includes(normalizedSearch) || normalizedSearch.includes(normalizedTask)) return true;
  
  // Handle emoji characters in names
  if (/[\p{Emoji}]/u.test(normalizedSearch) || /[\p{Emoji}]/u.test(normalizedTask)) {
    const taskWithoutEmoji = normalizedTask.replace(/[\p{Emoji}]/gu, '').trim();
    const searchWithoutEmoji = normalizedSearch.replace(/[\p{Emoji}]/gu, '').trim();
    
    // Don't match if either becomes empty after emoji removal
    if (taskWithoutEmoji === '' || searchWithoutEmoji === '') return false;
    
    return taskWithoutEmoji === searchWithoutEmoji ||
           taskWithoutEmoji.includes(searchWithoutEmoji) ||
           searchWithoutEmoji.includes(taskWithoutEmoji);
  }
  
  return false;
}

/**
 * Resolve a list ID from either a direct ID or list name
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