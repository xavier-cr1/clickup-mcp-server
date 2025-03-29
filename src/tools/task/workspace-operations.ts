/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp MCP Workspace Task Operations
 * 
 * This module defines tools for workspace-wide task operations, including
 * filtering tasks across the entire workspace with tag-based filtering.
 */

import { TaskFilters } from '../../services/clickup/types.js';

/**
 * Tool definition for getting workspace tasks
 */
export const getWorkspaceTasksTool = {
  name: "get_workspace_tasks",
  description: `Purpose: Retrieve tasks from across the entire workspace with filtering.

Valid Usage:
1. Apply any combination of filters (tags, lists, statuses, etc.)
2. Use pagination for large result sets

Requirements:
- At least one filter parameter REQUIRED (tags, list_ids, statuses, etc.)

Notes:
- Searches across all lists in the workspace
- Tag filtering allows cross-list organization
- Set detail_level=summary for lightweight responses
- detail_level=detailed (default) returns complete data`,
  parameters: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by tag names. Only tasks with ALL specified tags will be returned.'
      },
      list_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by list IDs. Narrows the search to specific lists.'
      },
      folder_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by folder IDs. Narrows the search to specific folders.'
      },
      space_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by space IDs. Narrows the search to specific spaces.'
      },
      statuses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by status names (e.g., [\'To Do\', \'In Progress\']).'
      },
      assignees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by assignee IDs.'
      },
      date_created_gt: {
        type: 'number',
        description: 'Filter for tasks created after this timestamp.'
      },
      date_created_lt: {
        type: 'number',
        description: 'Filter for tasks created before this timestamp.'
      },
      date_updated_gt: {
        type: 'number',
        description: 'Filter for tasks updated after this timestamp.'
      },
      date_updated_lt: {
        type: 'number',
        description: 'Filter for tasks updated before this timestamp.'
      },
      due_date_gt: {
        type: 'number',
        description: 'Filter for tasks with due date greater than this timestamp.'
      },
      due_date_lt: {
        type: 'number',
        description: 'Filter for tasks with due date less than this timestamp.'
      },
      include_closed: {
        type: 'boolean',
        description: 'Include closed tasks in the results.'
      },
      include_archived_lists: {
        type: 'boolean',
        description: 'Include tasks from archived lists.'
      },
      include_closed_lists: {
        type: 'boolean',
        description: 'Include tasks from closed lists.'
      },
      archived: {
        type: 'boolean',
        description: 'Include archived tasks in the results.'
      },
      order_by: {
        type: 'string',
        enum: ['id', 'created', 'updated', 'due_date'],
        description: 'Sort field for ordering results.'
      },
      reverse: {
        type: 'boolean',
        description: 'Reverse sort order (descending).'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (0-based).'
      },
      detail_level: {
        type: 'string',
        enum: ['summary', 'detailed'],
        description: 'Level of detail to return. Use summary for lightweight responses or detailed for full task data. If not specified, defaults to "detailed".'
      }
    }
  },
  inputSchema: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by tag names. Only tasks with ALL specified tags will be returned.'
      },
      list_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by list IDs. Narrows the search to specific lists.'
      },
      folder_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by folder IDs. Narrows the search to specific folders.'
      },
      space_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by space IDs. Narrows the search to specific spaces.'
      },
      statuses: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by status names (e.g., [\'To Do\', \'In Progress\']).'
      },
      assignees: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter tasks by assignee IDs.'
      },
      date_created_gt: {
        type: 'number',
        description: 'Filter for tasks created after this timestamp.'
      },
      date_created_lt: {
        type: 'number',
        description: 'Filter for tasks created before this timestamp.'
      },
      date_updated_gt: {
        type: 'number',
        description: 'Filter for tasks updated after this timestamp.'
      },
      date_updated_lt: {
        type: 'number',
        description: 'Filter for tasks updated before this timestamp.'
      },
      due_date_gt: {
        type: 'number',
        description: 'Filter for tasks with due date greater than this timestamp.'
      },
      due_date_lt: {
        type: 'number',
        description: 'Filter for tasks with due date less than this timestamp.'
      },
      include_closed: {
        type: 'boolean',
        description: 'Include closed tasks in the results.'
      },
      include_archived_lists: {
        type: 'boolean',
        description: 'Include tasks from archived lists.'
      },
      include_closed_lists: {
        type: 'boolean',
        description: 'Include tasks from closed lists.'
      },
      archived: {
        type: 'boolean',
        description: 'Include archived tasks in the results.'
      },
      order_by: {
        type: 'string',
        enum: ['id', 'created', 'updated', 'due_date'],
        description: 'Sort field for ordering results.'
      },
      reverse: {
        type: 'boolean',
        description: 'Reverse sort order (descending).'
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (0-based).'
      },
      detail_level: {
        type: 'string',
        enum: ['summary', 'detailed'],
        description: 'Level of detail to return. Use summary for lightweight responses or detailed for full task data. If not specified, defaults to "detailed".'
      }
    }
  }
}; 