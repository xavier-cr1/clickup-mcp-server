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
    description: "Task ID (preferred). Use instead of taskName if available."
  },
  taskName: {
    type: "string", 
    description: "Task name. Requires listName when used."
  },
  listName: {
    type: "string",
    description: "REQUIRED with taskName: List containing the task."
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
  description: "Create multiple tasks in a list efficiently. You MUST provide:\n1. An array of tasks with required properties\n2. Either listId or listName to specify the target list\n\nOptional: Configure batch size and concurrency for performance.",
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
  description: "Update multiple tasks efficiently. For each task, you MUST provide either:\n1. taskId alone (preferred)\n2. taskName + listName\n\nOnly specified fields will be updated for each task.",
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
  description: "Move multiple tasks to a different list efficiently. For each task, you MUST provide either:\n1. taskId alone (preferred)\n2. taskName + listName\n\nWARNING: Task statuses may reset if target list has different status options.",
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
  description: "⚠️ PERMANENTLY DELETE multiple tasks. This action cannot be undone. For each task, you MUST provide either:\n1. taskId alone (preferred and safest)\n2. taskName + listName (use with caution).",
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