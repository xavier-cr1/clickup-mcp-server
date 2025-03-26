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
  description: `Purpose: Create a single task in a ClickUp list.

Valid Usage:
1. Provide listId (preferred if available)
2. Provide listName (system will look up the list ID)

Requirements:
- name: REQUIRED
- EITHER listId OR listName: REQUIRED

Notes:
- For multiple tasks, use create_bulk_tasks instead
- Reuse list IDs from previous responses when possible to avoid redundant lookups
- To create a subtask, set the parent parameter to the ID of the parent task`,
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
      },
      parent: {
        type: "string",
        description: "Optional ID of the parent task. When specified, this task will be created as a subtask of the specified parent task."
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional array of tag names to assign to the task. The tags must already exist in the space."
      }
    }
  }
};

/**
 * Tool definition for updating a task
 */
export const updateTaskTool = {
  name: "update_task",
  description: `Purpose: Modify properties of an existing task.

Valid Usage:
1. Use taskId alone (preferred if available)
2. Use taskName + listName

Requirements:
- At least one update field (name, description, status, priority, dueDate) must be provided
- When using taskName, listName is REQUIRED

Notes:
- Only specified fields will be updated
- Using taskId is more reliable than taskName`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to update (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
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
  description: `Purpose: Move a task to a different list.

Valid Usage:
1. Use taskId + (listId OR listName) - preferred
2. Use taskName + sourceListName + (listId OR listName)

Requirements:
- Destination list: EITHER listId OR listName REQUIRED
- When using taskName, sourceListName is REQUIRED

Warning:
- Task statuses may reset if destination list has different status options
- System cannot find a task by name without knowing which list to search in`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to move (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
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
  description: `Purpose: Create a copy of a task in the same or different list.

Valid Usage:
1. Use taskId + optional (listId OR listName) - preferred
2. Use taskName + sourceListName + optional (listId OR listName)

Requirements:
- When using taskName, sourceListName is REQUIRED

Notes:
- The duplicate preserves the original task's properties
- If no destination list specified, uses same list as original task

Warning:
- System cannot find a task by name without knowing which list to search in`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to duplicate (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
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
  description: `Purpose: Retrieve detailed information about a specific task.

Valid Usage:
1. Use taskId alone (preferred) - works with both regular and custom IDs (like "DEV-1234")
2. Use taskName + listName
3. Use customTaskId for explicit custom ID lookup

Requirements:
- When using taskName, listName is REQUIRED
- When using customTaskId, listName is recommended for faster lookup

Note:
- Task names are only unique within a list, so the system needs to know which list to search in
- Regular task IDs are always 9 characters long (e.g., "86b394eqa")
- Custom IDs have an uppercase prefix followed by a hyphen and number (e.g., "DEV-1234")
- Set subtasks=true to include all subtasks in the response`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to retrieve (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234'). The system automatically detects the ID format."
      },
      taskName: {
        type: "string",
        description: "Name of task to retrieve. When using this parameter, you MUST also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of list containing the task. REQUIRED when using taskName."
      },
      customTaskId: {
        type: "string",
        description: "Custom task ID (e.g., 'DEV-1234'). Only use this if you want to explicitly force custom ID lookup. In most cases, you can just use taskId which auto-detects ID format."
      },
      subtasks: {
        type: "boolean",
        description: "Whether to include subtasks in the response. Set to true to retrieve full details of all subtasks."
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
  description: `Purpose: Retrieve tasks from a list with optional filtering.

Valid Usage:
1. Use listId (preferred)
2. Use listName

Requirements:
- EITHER listId OR listName is REQUIRED

Notes:
- Use filters (archived, statuses, etc.) to narrow down results
- Pagination available through page parameter
- Sorting available through order_by and reverse parameters`,
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
      subtasks: {
        type: "boolean",
        description: "Include subtasks"
      },
      statuses: {
        type: "array",
        items: { type: "string" },
        description: "Filter by status names (e.g. ['To Do', 'In Progress'])"
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
      }
    },
    required: []
  }
};

/**
 * Tool definition for retrieving task comments
 */
export const getTaskCommentsTool = {
  name: "get_task_comments",
  description: `Purpose: Retrieve comments for a ClickUp task.

Valid Usage:
1. Use taskId (preferred)
2. Use taskName + optional listName

Notes:
- If using taskName, providing listName helps locate the correct task
- Task names may not be unique across different lists
- Use start and startId parameters for pagination through comments`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to retrieve comments for (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
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

/**
 * Tool definition for creating a comment on a task
 */
export const createTaskCommentTool = {
  name: "create_task_comment",
  description: `Purpose: Create a comment on a ClickUp task.

Valid Usage:
1. Use taskId (preferred)
2. Use taskName + listName

Requirements:
- EITHER taskId OR (taskName + listName) is REQUIRED
- commentText is REQUIRED

Notes:
- When using taskName, providing listName helps locate the correct task
- Set notifyAll to true to send notifications to all task assignees
- Use assignee to assign the comment to a specific user (optional)`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to comment on (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
      },
      taskName: {
        type: "string",
        description: "Name of task to comment on. When using this parameter, you MUST also provide listName."
      },
      listName: {
        type: "string",
        description: "Name of list containing the task. REQUIRED when using taskName."
      },
      commentText: {
        type: "string",
        description: "REQUIRED: Text content of the comment to create."
      },
      notifyAll: {
        type: "boolean",
        description: "Whether to notify all assignees. Default is false."
      },
      assignee: {
        type: "number",
        description: "Optional user ID to assign the comment to."
      }
    },
    required: ["commentText"]
  }
};

/**
 * Tool definition for deleting a task
 */
export const deleteTaskTool = {
  name: "delete_task",
  description: `Purpose: PERMANENTLY DELETE a task.

Valid Usage:
1. Use taskId alone (preferred and safest)
2. Use taskName + optional listName

Warning:
- This action CANNOT be undone
- Using taskName is risky as names may not be unique
- Provide listName when using taskName for more precise targeting`,
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of task to delete (preferred). Works with both regular task IDs (9 characters) and custom IDs with uppercase prefixes (like 'DEV-1234')."
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