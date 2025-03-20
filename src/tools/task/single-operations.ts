/**
 * ClickUp MCP Single Task Operations
 * 
 * This module defines tools for single task operations including creating,
 * updating, moving, duplicating, and deleting tasks, as well as retrieving
 * task details and comments.
 */

import { 
  ClickUpComment,
  ClickUpTask, 
  CreateTaskData,
  TaskPriority, 
  UpdateTaskData
} from '../../services/clickup/types.js';
import { parseDueDate } from '../utils.js';
import { clickUpServices } from '../../services/shared.js';
import { 
  formatTaskData,
  resolveTaskIdWithValidation, 
  resolveListIdWithValidation,
  validateTaskUpdateData,
  validateTaskIdentification,
  validateListIdentification
} from './utilities.js';

// Use shared services instance
const { task: taskService } = clickUpServices;

//=============================================================================
// COMMON VALIDATION UTILITIES
//=============================================================================

// Common validation functions
const validateTaskName = (name: string) => {
  if (!name || typeof name !== 'string') {
    throw new Error("A task name is required");
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new Error("Task name cannot be empty or only whitespace");
  }
  return trimmedName;
};

const validatePriority = (priority?: number) => {
  if (priority !== undefined && (typeof priority !== 'number' || priority < 1 || priority > 4)) {
    throw new Error("Priority must be a number between 1 and 4");
  }
};

const validateDueDate = (dueDate?: string) => {
  if (dueDate && typeof dueDate !== 'string') {
    throw new Error("Due date must be a string in timestamp format or natural language");
  }
};

// Common error handler
const handleOperationError = (operation: string, error: any) => {
  console.error(`Error ${operation}:`, error);
  throw error;
};

//=============================================================================
// SINGLE TASK OPERATION TOOLS
//=============================================================================

/**
 * Tool definition for creating a single task
 */
export const createTaskTool = {
  name: "create_task",
  description: "Create a single task in a ClickUp list. Use this tool for individual task creation only. For multiple tasks, use create_bulk_tasks instead. Before calling this tool, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups. When creating a task, you MUST provide either a listId or listName.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "REQUIRED: Name of the task. Put a relevant emoji followed by a blank space before the name."
      },
      listId: {
        type: "string",
        description: "REQUIRED (unless listName provided): ID of the list to create the task in. If you have this ID from a previous response, use it directly rather than looking up by name."
      },
      listName: {
        type: "string",
        description: "REQUIRED (unless listId provided): Name of the list to create the task in - will automatically find the list by name."
      },
      description: {
        type: "string",
        description: "Optional plain text description for the task"
      },
      markdown_description: {
        type: "string",
        description: "Optional markdown formatted description for the task. If provided, this takes precedence over description"
      },
      status: {
        type: "string",
        description: "Optional: Override the default ClickUp status. In most cases, you should omit this to use ClickUp defaults"
      },
      priority: {
        type: "number",
        description: "Optional priority of the task (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set this when explicitly requested."
      },
      dueDate: {
        type: "string",
        description: "Optional due date. Supports Unix timestamps (ms) or natural language like '1 hour from now', 'tomorrow', 'next week', etc."
      }
    }
  }
};

/**
 * Tool definition for updating a task
 */
export const updateTaskTool = {
  name: "update_task",
  description: "Modify an existing task's properties. Valid parameter combinations:\n1. Use taskId alone (preferred if you have it)\n2. Use taskName + listName (listName is REQUIRED when using taskName, not optional)\n\nAt least one update field (name, description, status, priority) must be provided. Only specified fields will be updated.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to update (preferred). Use this instead of taskName if you have it from a previous response."
      },
      taskName: {
        type: "string",
        description: "Name of the task to update. Only use this if you don't have taskId. When using this parameter, you MUST also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task. REQUIRED when using taskName."
      },
      name: {
        type: "string",
        description: "New name for the task. Include emoji prefix if appropriate."
      },
      description: {
        type: "string",
        description: "New plain text description. Will be ignored if markdown_description is provided."
      },
      markdown_description: {
        type: "string",
        description: "New markdown description. Takes precedence over plain text description."
      },
      status: {
        type: "string",
        description: "New status. Must be valid for the task's current list."
      },
      priority: {
        type: ["number", "null"],
        enum: [1, 2, 3, 4, null],
        description: "New priority: 1 (urgent) to 4 (low). Set null to clear priority."
      },
      dueDate: {
        type: "string",
        description: "New due date. Supports both Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', 'next week', or '3 days from now'."
      }
    },
    required: []
  }
};

/**
 * Tool definition for moving a task
 */
export const moveTaskTool = {
  name: "move_task",
  description: "Move a task to a different list. Valid parameter combinations:\n1. Use taskId + (listId or listName) - preferred\n2. Use taskName + sourceListName + (listId or listName)\n\nWARNING: When using taskName, sourceListName is ABSOLUTELY REQUIRED - the system cannot find a task by name without knowing which list to search in. Task statuses may reset if destination list has different status options.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to move (preferred). Use this instead of taskName if you have it."
      },
      taskName: {
        type: "string",
        description: "Name of the task to move. When using this, you MUST also provide sourceListName."
      },
      sourceListName: {
        type: "string",
        description: "REQUIRED with taskName: Current list containing the task."
      },
      listId: {
        type: "string",
        description: "ID of destination list (preferred). Use this instead of listName if you have it."
      },
      listName: {
        type: "string",
        description: "Name of destination list. Only use if you don't have listId."
      }
    },
    required: []
  }
};

/**
 * Tool definition for duplicating a task
 */
export const duplicateTaskTool = {
  name: "duplicate_task",
  description: "Create a copy of a task in the same or different list. Valid parameter combinations:\n1. Use taskId + optional (listId or listName) - preferred\n2. Use taskName + sourceListName + optional (listId or listName)\n\nWARNING: When using taskName, sourceListName is ABSOLUTELY REQUIRED - the system cannot find a task by name without knowing which list to search in. The duplicate preserves the original task's properties.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to duplicate (preferred). Use this instead of taskName if you have it."
      },
      taskName: {
        type: "string",
        description: "Name of task to duplicate. When using this, you MUST provide sourceListName."
      },
      sourceListName: {
        type: "string",
        description: "REQUIRED with taskName: List containing the original task."
      },
      listId: {
        type: "string",
        description: "ID of list for the duplicate (optional). Defaults to same list as original."
      },
      listName: {
        type: "string",
        description: "Name of list for the duplicate. Only use if you don't have listId."
      }
    },
    required: []
  }
};

/**
 * Tool definition for retrieving a task
 */
export const getTaskTool = {
  name: "get_task",
  description: "Retrieve detailed information about a specific task. Valid parameter combinations:\n1. Use taskId alone (preferred)\n2. Use taskName + listName (listName is REQUIRED when using taskName). Task names are only unique within a list, so the system needs to know which list to search in.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to retrieve (preferred). Use this instead of taskName if you have it."
      },
      taskName: {
        type: "string",
        description: "Name of task to retrieve. When using this parameter, you MUST also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of list containing the task. REQUIRED when using taskName."
      }
    },
    required: []
  }
};

/**
 * Tool definition for retrieving tasks from a list
 */
export const getTasksTool = {
  name: "get_tasks",
  description: "Retrieve tasks from a list with optional filtering. You MUST provide either:\n1. listId (preferred)\n2. listName\n\nUse filters to narrow down results by status, dates, etc.",
  inputSchema: {
    type: "object",
    properties: {
      listId: {
        type: "string",
        description: "ID of list to get tasks from (preferred). Use this instead of listName if you have it."
      },
      listName: {
        type: "string",
        description: "Name of list to get tasks from. Only use if you don't have listId."
      },
      archived: {
        type: "boolean",
        description: "Include archived tasks"
      },
      page: {
        type: "number",
        description: "Page number for pagination (starts at 0)"
      },
      order_by: {
        type: "string",
        description: "Sort field: due_date, created, updated"
      },
      reverse: {
        type: "boolean",
        description: "Reverse sort order (descending)"
      },
      subtasks: {
        type: "boolean",
        description: "Include subtasks"
      },
      statuses: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Filter by status names (e.g. ['To Do', 'In Progress'])"
      }
    },
    required: []
  }
};

/**
 * Tool definition for deleting a task
 */
export const deleteTaskTool = {
  name: "delete_task",
  description: "⚠️ PERMANENTLY DELETE a task. This action cannot be undone. Valid parameter combinations:\n1. Use taskId alone (preferred and safest)\n2. Use taskName + optional listName (use with caution).",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to delete (preferred). Use this instead of taskName for safety."
      },
      taskName: {
        type: "string",
        description: "Name of task to delete. Use with extreme caution as names may not be unique."
      },
      listName: {
        type: "string",
        description: "Name of list containing the task. Helps ensure correct task deletion when using taskName."
      }
    }
  }
};

/**
 * Tool definition for retrieving task comments
 */
export const getTaskCommentsTool = {
  name: "get_task_comments",
  description: "Retrieve comments for a ClickUp task. You can identify the task by either taskId or taskName. If using taskName, you can optionally provide listName to help locate the correct task if multiple tasks have the same name.",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to retrieve comments for (preferred). Use this instead of taskName if you have it."
      },
      taskName: {
        type: "string",
        description: "Name of task to retrieve comments for. Warning: Task names may not be unique."
      },
      listName: {
        type: "string",
        description: "Name of list containing the task. Helps find the right task when using taskName."
      },
      start: {
        type: "number",
        description: "Timestamp (in milliseconds) to start retrieving comments from. Used for pagination."
      },
      startId: {
        type: "string",
        description: "Comment ID to start from. Used together with start for pagination."
      }
    }
  }
}; 