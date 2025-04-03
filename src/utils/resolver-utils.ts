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
  // Quick return checks for nullish values
  if (!taskName || !searchTerm) return false;
  
  // Normalize inputs
  const normalizedTask = taskName.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  // Handle empty strings - important to prevent blank tasks from matching
  if (normalizedTask === '' || normalizedSearch === '') return false;
  
  // Special case: Reject tasks that are just whitespace
  if (/^\s+$/.test(taskName)) {
    console.log('Rejecting whitespace-only task name:', JSON.stringify(taskName));
    return false;
  }
  
  // Handle exact match
  if (normalizedTask === normalizedSearch) return true;
  
  // Handle substring matches
  if (normalizedTask.includes(normalizedSearch) || normalizedSearch.includes(normalizedTask)) return true;
  
  // --------------------------------------
  // Special handling for emoji prefixes
  // --------------------------------------
  
  // Extract text parts (ignore emojis)
  const extractTextPart = (str: string): string => {
    // Remove all emoji sequences and trim
    return str.replace(/[\p{Emoji}\u{FE00}-\u{FE0F}\u200d]+/gu, '').trim();
  };
  
  const taskTextPart = extractTextPart(normalizedTask);
  const searchTextPart = extractTextPart(normalizedSearch);
  
  // If either becomes empty after emoji removal, they're just emojis
  if (taskTextPart === '' || searchTextPart === '') return false;
  
  // Debug logging for emoji cases
  if (taskName.length !== taskTextPart.length || searchTerm.length !== searchTextPart.length) {
    console.log(`Emoji handling: "${taskName}" vs "${searchTerm}"`);
    console.log(`  - Text parts: "${taskTextPart}" vs "${searchTextPart}"`);
  }
  
  // Perform flexible text-only matching
  if (taskTextPart === searchTextPart) return true;
  if (taskTextPart.includes(searchTextPart)) return true;
  if (searchTextPart.includes(taskTextPart)) return true;
  
  // Additional check specifically for "📋 Project Initialization" type cases
  if (taskTextPart === "project initialization" && searchTextPart === "project initialization") return true;
  
  // No match found
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