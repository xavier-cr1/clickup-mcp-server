/**
 * ClickUp MCP Bulk Task Operations
 * 
 * This module defines tools for bulk task operations including creating,
 * updating, moving, and deleting multiple tasks at once.
 */

import { TaskPriority } from '../../services/clickup/types.js';
import { clickUpServices } from '../../services/shared.js';
import { BulkService } from '../../services/clickup/bulk.js';
import { parseDueDate } from '../utils.js';
import { 
  validateBulkTasks, 
  parseBulkOptions,
  resolveTaskIdWithValidation,
  resolveListIdWithValidation
} from './utilities.js';

// Initialize services
const { task: taskService } = clickUpServices;
const bulkService = new BulkService(taskService);

//=============================================================================
// COMMON SCHEMA DEFINITIONS
//=============================================================================

// Common schema definitions
const bulkOptionsSchema = {
  oneOf: [
    {
      type: "object",
      description: "Optional processing settings",
      properties: {
        batchSize: {
          type: "number", 
          description: "Tasks per batch (default: 10)"
        },
        concurrency: {
          type: "number",
          description: "Parallel operations (default: 3)"
        },
        continueOnError: {
          type: "boolean",
          description: "Continue if some tasks fail"
        },
        retryCount: {
          type: "number",
          description: "Retry attempts for failures"
        }
      }
    },
    {
      type: "string",
      description: "JSON string representing options. Will be parsed automatically."
    }
  ],
  description: "Processing options (or JSON string representing options)"
};

const taskIdentifierSchema = {
  taskId: {
    type: "string",
    description: "Task ID (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
  },
  taskName: {
    type: "string", 
    description: "Task name. Requires listName when used."
  },
  listName: {
    type: "string",
    description: "REQUIRED with taskName: List containing the task."
  },
  customTaskId: {
    type: "string",
    description: "Custom task ID (e.g., 'DEV-1234'). Only use if you want to explicitly force custom ID lookup. In most cases, use taskId which auto-detects ID format."
  }
};

//=============================================================================
// BULK TASK OPERATION TOOLS
//=============================================================================

/**
 * Tool definition for creating multiple tasks at once
 */
export const createBulkTasksTool = {
  name: "create_bulk_tasks",
  description: `Purpose: Create multiple tasks in a list efficiently.

Valid Usage:
1. An array of tasks with required properties + listId (preferred)
2. An array of tasks with required properties + listName

Requirements:
- tasks: REQUIRED (array of tasks, each with at least a name)
- EITHER listId OR listName: REQUIRED

Notes:
- Configure batch size and concurrency via options for performance
- Each task should have a name with emoji prefix
- All tasks will be created in the same list`,
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "ID of list for new tasks (preferred). Use this instead of listName if you have it."
      },
      listName: {
        type: "string",
        description: "Name of list for new tasks. Only use if you don't have listId."
      },
      tasks: {
        type: "array",
        description: "Array of tasks to create. Each task must have at least a name.",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Task name with emoji prefix"
            },
            description: {
              type: "string",
              description: "Plain text description"
            },
            markdown_description: {
              type: "string",
              description: "Markdown description (overrides plain text)"
            },
            status: {
              type: "string",
              description: "Task status (uses list default if omitted)"
            },
            priority: {
              type: "number",
              description: "Priority 1-4 (1=urgent, 4=low)"
            },
            dueDate: {
              type: "string",
              description: "Due date. Supports Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', 'next week', etc."
            },
            tags: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Optional array of tag names to assign to the task. The tags must already exist in the space."
            }
          },
          required: ["name"]
        }
      },
      options: bulkOptionsSchema
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for updating multiple tasks at once
 */
export const updateBulkTasksTool = {
  name: "update_bulk_tasks",
  description: `Purpose: Update multiple tasks efficiently in a single operation.

Valid Usage:
1. For each task, provide taskId (preferred)
2. For each task, provide taskName + listName

Requirements:
- tasks: REQUIRED (array of tasks to update)
- For each task entry, EITHER taskId OR (taskName + listName) is REQUIRED
- At least one update field per task (name, description, status, priority, dueDate)

Notes:
- Only specified fields will be updated for each task
- Configure batch size and concurrency via options for performance
- Each task can have different fields to update`,
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "Array of tasks to update",
        items: {
          type: "object",
          properties: {
            ...taskIdentifierSchema,
            name: {
              type: "string",
              description: "New name with emoji prefix"
            },
            description: {
              type: "string",
              description: "New plain text description"
            },
            markdown_description: {
              type: "string",
              description: "New markdown description"
            },
            status: {
              type: "string",
              description: "New status"
            },
            priority: {
              type: ["number", "null"],
              enum: [1, 2, 3, 4, null],
              description: "New priority (1-4 or null)"
            },
            dueDate: {
              type: "string",
              description: "New due date. Supports Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', etc."
            }
          }
        }
      },
      options: bulkOptionsSchema
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for moving multiple tasks at once
 */
export const moveBulkTasksTool = {
  name: "move_bulk_tasks",
  description: `Purpose: Move multiple tasks to a different list efficiently.

Valid Usage:
1. For each task, provide taskId + target list (preferred)
2. For each task, provide taskName + listName + target list

Requirements:
- tasks: REQUIRED (array of tasks to move)
- EITHER targetListId OR targetListName: REQUIRED
- For each task entry, EITHER taskId OR (taskName + listName) is REQUIRED

Notes:
- Configure batch size and concurrency via options for performance
- All tasks will be moved to the same destination list

⚠️ Warning:
- Task statuses may reset if destination list has different status options
- Using taskName without listName will fail as tasks may have identical names across lists`,
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "Array of tasks to move",
        items: {
          type: "object",
          properties: {
            ...taskIdentifierSchema
          }
        }
      },
      targetListId: {
        type: "string",
        description: "ID of destination list (preferred). Use instead of targetListName if available."
      },
      targetListName: {
        type: "string",
        description: "Name of destination list. Only use if you don't have targetListId."
      },
      options: bulkOptionsSchema
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for deleting multiple tasks at once
 */
export const deleteBulkTasksTool = {
  name: "delete_bulk_tasks",
  description: `Purpose: PERMANENTLY DELETE multiple tasks at once.

Valid Usage:
1. For each task, provide taskId (preferred and safest)
2. For each task, provide taskName + listName

Requirements:
- tasks: REQUIRED (array of tasks to delete)
- For each task entry, EITHER taskId OR (taskName + listName) is REQUIRED

Notes:
- Configure batch size and concurrency via options for performance

⚠️ CRITICAL WARNING:
- This action CANNOT be undone for any of the tasks
- Using taskName without listName is dangerous as names may not be unique
- Always provide listName when using taskName for safer targeting`,
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "Array of tasks to delete",
        items: {
          type: "object",
          properties: {
            ...taskIdentifierSchema
          }
        }
      },
      options: bulkOptionsSchema
    },
    required: ["tasks"]
  }
};