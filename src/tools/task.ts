/**
 * ClickUp MCP Task Tools
 * 
 * This module defines task-related tools including creating, updating, 
 * moving, duplicating, and deleting tasks. It also provides tools for 
 * retrieving task details.
 */

import { 
  ClickUpComment,
  ClickUpList,
  ClickUpStatus,
  ClickUpTask,
  CreateTaskData,
  TaskFilters,
  TaskPriority,
  UpdateTaskData
} from '../services/clickup/types.js';
import { clickUpServices } from '../services/shared.js';
import config from '../config.js';
import { findListIDByName } from './list.js';
import { parseDueDate, formatDueDate, enhanceResponseWithSponsor, resolveListId, resolveTaskId } from './utils.js';
import { WorkspaceService } from '../services/clickup/workspace.js';
import { BatchProcessingOptions } from '../utils/concurrency-utils.js';
import { BulkService } from '../services/clickup/bulk.js';

// Use shared services instance
const { task: taskService, workspace: workspaceService } = clickUpServices;

// Create a bulk service instance that uses the task service
const bulkService = new BulkService(taskService);

/**
 * Tool definition for creating a single task
 */
export const createTaskTool = {
  name: "create_task",
  description: "Create a single task in a ClickUp list. Use this tool for individual task creation only. For multiple tasks, use create_bulk_tasks instead. Before calling this tool, check if you already have the necessary list ID from previous responses in the conversation history, as this avoids redundant lookups. When creating a task, you must provide either a listId or listName.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the task. Put a relevant emoji followed by a blank space before the name."
      },
      description: {
        type: "string",
        description: "Plain text description for the task"
      },
      markdown_description: {
        type: "string",
        description: "Markdown formatted description for the task. If provided, this takes precedence over description"
      },
      listId: {
        type: "string",
        description: "ID of the list to create the task in (optional if using listName instead). If you have this ID from a previous response, use it directly rather than looking up by name."
      },
      listName: {
        type: "string",
        description: "Name of the list to create the task in - will automatically find the list by name (optional if using listId instead). Only use this if you don't already have the list ID from previous responses."
      },
      status: {
        type: "string",
        description: "OPTIONAL: Override the default ClickUp status. In most cases, you should omit this to use ClickUp defaults"
      },
      priority: {
        type: "number",
        description: "Priority of the task (1-4), where 1 is urgent/highest priority and 4 is lowest priority. Only set this when the user explicitly requests a priority level."
      },
      dueDate: {
        type: "string",
        description: "Due date of the task. Supports both Unix timestamps (in milliseconds) and natural language expressions like '1 hour from now', 'tomorrow', 'next week', or '3 days from now'."
      }
    },
    required: ["name"]
  },
  async handler({ name, description, markdown_description, dueDate, priority, status, listId, listName }: {
    name: string;
    description?: string;
    markdown_description?: string;
    dueDate?: string;
    priority?: number;
    status?: string;
    listId?: string;
    listName?: string;
  }) {
    let targetListId = listId;
    
    // If no listId but listName is provided, look up the list ID
    if (!targetListId && listName) {
      // Use workspace service to find list by name
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`List "${listName}" not found`);
      }
      targetListId = listInfo.id;
    }
    
    if (!targetListId) {
      throw new Error("Either listId or listName must be provided");
    }

    // Prepare task data
    const taskData: CreateTaskData = {
      name,
      description,
      markdown_description,
      status,
      priority: priority as TaskPriority,
      due_date: dueDate ? parseDueDate(dueDate) : undefined
    };

    // Add due_date_time flag if due date is set
    if (dueDate && taskData.due_date) {
      taskData.due_date_time = true;
    }

    // Create the task
    const createdTask = await taskService.createTask(targetListId, taskData);

    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: createdTask.id,
          name: createdTask.name,
          url: createdTask.url,
          status: createdTask.status?.status || "New",
          due_date: createdTask.due_date ? formatDueDate(Number(createdTask.due_date)) : undefined,
          list: createdTask.list.name,
          space: createdTask.space.name,
          folder: createdTask.folder?.name
        }, null, 2)
      }]
    };
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
  },
  async handler({ taskId, taskName, listName, name, description, markdown_description, status, priority, dueDate }: {
    taskId?: string;
    taskName?: string;
    listName?: string;
    name?: string;
    description?: string;
    markdown_description?: string;
    status?: string;
    priority?: number | null;
    dueDate?: string;
  }) {
    let targetTaskId = taskId;
    
    // If no taskId but taskName is provided, look up the task ID
    if (!targetTaskId && taskName) {
      // First find the list ID if listName is provided
      let listId: string | undefined;
      
      if (listName) {
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
        
        if (!listInfo) {
          throw new Error(`List "${listName}" not found`);
        }
        listId = listInfo.id;
      }
      
      // Use the improved findTaskByName method
      const foundTask = await taskService.findTaskByName(listId || '', taskName);
      
      if (!foundTask) {
        throw new Error(`Task "${taskName}" not found${listName ? ` in list "${listName}"` : ""}`);
      }
      targetTaskId = foundTask.id;
    }
    
    if (!targetTaskId) {
      throw new Error("Either taskId or taskName must be provided");
    }
    
    // Prepare update data
    const updateData: UpdateTaskData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (markdown_description !== undefined) updateData.markdown_description = markdown_description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) {
      updateData.priority = priority === null ? null : (priority as TaskPriority);
    }
    if (dueDate !== undefined) {
      updateData.due_date = dueDate ? parseDueDate(dueDate) : null;
      if (dueDate && updateData.due_date) {
        updateData.due_date_time = true;
      }
    }
    
    // Update the task
    const updatedTask = await taskService.updateTask(targetTaskId, updateData);
    
    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: updatedTask.id,
          name: updatedTask.name,
          url: updatedTask.url,
          status: updatedTask.status?.status || "Unknown",
          updated: true,
          due_date: updatedTask.due_date ? formatDueDate(Number(updatedTask.due_date)) : undefined,
          list: updatedTask.list.name,
          folder: updatedTask.folder?.name
        }, null, 2)
      }]
    };
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
  },
  async handler({ taskId, taskName, sourceListName, listId, listName }: {
    taskId?: string;
    taskName?: string;
    sourceListName?: string;
    listId?: string;
    listName?: string;
  }) {
    let targetTaskId = taskId;
    let targetListId = listId;
    
    // If no taskId but taskName is provided, look up the task ID
    if (!targetTaskId && taskName) {
      // First find the source list ID if sourceListName is provided
      let sourceListId: string | undefined;
      
      if (sourceListName) {
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, sourceListName, 'list');
        
        if (!listInfo) {
          throw new Error(`Source list "${sourceListName}" not found`);
        }
        sourceListId = listInfo.id;
      }
      
      // Use the improved findTaskByName method
      const foundTask = await taskService.findTaskByName(sourceListId || '', taskName);
      
      if (!foundTask) {
        throw new Error(`Task "${taskName}" not found${sourceListName ? ` in list "${sourceListName}"` : ""}`);
      }
      targetTaskId = foundTask.id;
    }
    
    if (!targetTaskId) {
      throw new Error("Either taskId or taskName must be provided");
    }
    
    // If no listId but listName is provided, look up the list ID
    if (!targetListId && listName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`List "${listName}" not found`);
      }
      targetListId = listInfo.id;
    }
    
    if (!targetListId) {
      throw new Error("Either listId or listName must be provided");
    }
    
    // Move the task
    const movedTask = await taskService.moveTask(targetTaskId, targetListId);
    
    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: movedTask.id,
          name: movedTask.name,
          url: movedTask.url,
          status: movedTask.status?.status || "Unknown",
          due_date: movedTask.due_date ? formatDueDate(Number(movedTask.due_date)) : undefined,
          list: movedTask.list.name,
          moved: true
        }, null, 2)
      }]
    };
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
  },
  async handler({ taskId, taskName, sourceListName, listId, listName }: {
    taskId?: string;
    taskName?: string;
    sourceListName?: string;
    listId?: string;
    listName?: string;
  }) {
    let targetTaskId = taskId;
    let sourceListId: string | undefined;
    
    // If sourceListName is provided, find the source list ID
    if (sourceListName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, sourceListName, 'list');
      
      if (!listInfo) {
        throw new Error(`Source list "${sourceListName}" not found`);
      }
      sourceListId = listInfo.id;
    }
    
    // If no taskId but taskName is provided, look up the task ID
    if (!targetTaskId && taskName) {
      // Find the task in the source list if specified, otherwise search all tasks
      if (sourceListId) {
        // Use the improved findTaskByName method
        const foundTask = await taskService.findTaskByName(sourceListId, taskName);
        
        if (!foundTask) {
          throw new Error(`Task "${taskName}" not found in list "${sourceListName}"`);
        }
        targetTaskId = foundTask.id;
      } else {
        // Without a source list, we need to search more broadly
        throw new Error("When using taskName, sourceListName must be provided to find the task");
      }
    }
    
    if (!targetTaskId) {
      throw new Error("Either taskId or taskName (with sourceListName) must be provided");
    }
    
    let targetListId = listId;
    
    // If no listId but listName is provided, look up the list ID
    if (!targetListId && listName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`Target list "${listName}" not found`);
      }
      targetListId = listInfo.id;
    }
    
    // Duplicate the task
    const task = await taskService.duplicateTask(targetTaskId, targetListId);

    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: task.id,
          name: task.name,
          url: task.url,
          duplicated: true,
          due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
          list: task.list.name,
          space: task.space.name,
          folder: task.folder?.name
        }, null, 2)
      }]
    };
  }
};

/**
 * Tool definition for getting task details
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
  },
  async handler({ taskId, taskName, listName }: {
    taskId?: string;
    taskName?: string;
    listName?: string;
  }) {
    let targetTaskId = taskId;
    
    // If no taskId but taskName is provided, look up the task ID
    if (!targetTaskId && taskName) {
      let listId: string | undefined;
      
      if (listName) {
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
        
        if (!listInfo) {
          throw new Error(`List "${listName}" not found`);
        }
        listId = listInfo.id;
      }
      
      // Use the improved findTaskByName method
      const foundTask = await taskService.findTaskByName(listId || '', taskName);
      
      if (!foundTask) {
        throw new Error(`Task "${taskName}" not found${listName ? ` in list "${listName}"` : ""}`);
      }
      targetTaskId = foundTask.id;
    }
    
    if (!targetTaskId) {
      throw new Error("Either taskId or taskName must be provided");
    }
    
    // Get the task
    const task = await taskService.getTask(targetTaskId);
    
    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: task.id,
          name: task.name,
          description: task.description,
          status: task.status?.status || "Unknown",
          priority: task.priority,
          due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
          due_date_raw: task.due_date, // Keep raw timestamp for reference if needed
          url: task.url,
          list: task.list.name,
          space: task.space.name,
          folder: task.folder?.name,
          creator: task.creator,
          assignees: task.assignees,
          tags: task.tags,
          time_estimate: task.time_estimate,
          time_spent: task.time_spent,
        }, null, 2)
      }]
    };
  }
};

/**
 * Tool definition for getting tasks from a list
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
  },
  async handler({ listId, listName, archived, page, order_by, reverse, subtasks, statuses }: {
    listId?: string;
    listName?: string;
    archived?: boolean;
    page?: number;
    order_by?: 'id' | 'created' | 'updated' | 'due_date';
    reverse?: boolean;
    subtasks?: boolean;
    statuses?: string[];
  }) {
    let targetListId = listId;
    
    // If no listId but listName is provided, look up the list ID
    if (!targetListId && listName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`List "${listName}" not found`);
      }
      targetListId = listInfo.id;
    }
    
    if (!targetListId) {
      throw new Error("Either listId or listName must be provided");
    }
    
    // Prepare filter options - remove archived as it's not in TaskFilters
    const filters: TaskFilters = {
      page,
      order_by,
      reverse,
      subtasks,
      statuses
    };
    
    // Get tasks with filters
    const tasks = await taskService.getTasks(targetListId, filters);
    
    // Format the tasks data to be more API friendly
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      name: task.name,
      status: task.status?.status || 'Unknown',
      url: task.url,
      due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
      due_date_raw: task.due_date,
      priority: task.priority?.priority,
      assignees: task.assignees?.map(a => a.username) || []
    }));
    
    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: tasks.length,
          tasks: formattedTasks
        }, null, 2)
      }]
    };
  }
};

/**
 * Tool definition for deleting a task
 */
export const deleteTaskTool = {
  name: "delete_task",
  description: "\u26a0\ufe0f PERMANENTLY DELETE a task. This action cannot be undone. Valid parameter combinations:\n1. Use taskId alone (preferred and safest)\n2. Use taskName + optional listName (use with caution)",
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
 * Tool definition for getting task comments
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
  },
  async handler({ taskId, taskName, listName, start, startId }: {
    taskId?: string;
    taskName?: string;
    listName?: string;
    start?: number;
    startId?: string;
  }) {
    let targetTaskId = taskId;
    
    // If no taskId but taskName is provided, look up the task ID
    if (!targetTaskId && taskName) {
      // First, we need to find the list if list name is provided
      let listId;
      if (listName) {
        // Use workspace service to find list by name
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
        
        if (!listInfo) {
          throw new Error(`List "${listName}" not found`);
        }
        listId = listInfo.id;
      }
      
      // Find task by name in the specific list or across workspace
      if (listId) {
        const task = await taskService.findTaskByName(listId, taskName);
        if (!task) {
          throw new Error(`Task "${taskName}" not found in list "${listName}"`);
        }
        targetTaskId = task.id;
      } else {
        // Search across all accessible tasks (slower, less reliable)
        const hierarchy = await workspaceService.getWorkspaceHierarchy();
        
        // Collect all lists from all spaces and folders
        const lists: { id: string; name: string }[] = [];
        
        // Recursively extract lists from hierarchy nodes
        const extractLists = (node: any) => {
          if (node.type === 'list') {
            lists.push({ id: node.id, name: node.name });
          }
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(extractLists);
          }
        };
        
        // Start extraction from root's children (spaces)
        if (hierarchy.root && hierarchy.root.children) {
          hierarchy.root.children.forEach(extractLists);
        }
        
        // Try to find the task in each list
        for (const list of lists) {
          try {
            const task = await taskService.findTaskByName(list.id, taskName);
            if (task) {
              targetTaskId = task.id;
              break;
            }
          } catch (error) {
            // Continue searching in other lists
          }
        }
        
        if (!targetTaskId) {
          throw new Error(`Task "${taskName}" not found in any list`);
        }
      }
    }
    
    if (!targetTaskId) {
      throw new Error("Either taskId or taskName must be provided");
    }
    
    // Retrieve comments for the task
    const comments = await taskService.getTaskComments(targetTaskId, start, startId);
    
    return {
      taskId: targetTaskId,
      comments: comments,
      totalComments: comments.length,
      pagination: {
        hasMore: comments.length === 25, // API returns max 25 comments at a time
        nextStart: comments.length > 0 ? new Date(comments[comments.length - 1].date).getTime() : undefined,
        nextStartId: comments.length > 0 ? comments[comments.length - 1].id : undefined
      }
    };
  }
};

// Export handlers to be used by the server
export async function handleCreateTask(parameters: any) {
  const { name, description, markdown_description, listId, listName, status, priority, dueDate } = parameters;
  
  // Validate required fields
  if (!name) {
    throw new Error("Task name is required");
  }
  
  let targetListId = listId;
  
  // If no listId but listName is provided, look up the list ID
  if (!targetListId && listName) {
    // Use workspace service to find the list by name in the hierarchy
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
    
    if (!listInfo) {
      throw new Error(`List "${listName}" not found`);
    }
    targetListId = listInfo.id;
  }
  
  if (!targetListId) {
    throw new Error("Either listId or listName must be provided");
  }

  // Prepare task data
  const taskData: CreateTaskData = {
    name,
    description,
    markdown_description,
    status,
    priority: priority as TaskPriority,
    due_date: dueDate ? parseDueDate(dueDate) : undefined
  };

  // Add due_date_time flag if due date is set
  if (dueDate && taskData.due_date) {
    taskData.due_date_time = true;
  }

  // Create the task
  const task = await taskService.createTask(targetListId, taskData);

  // Create response object
  const response = {
    content: [{
      type: "text",
      text: JSON.stringify({
        id: task.id,
        name: task.name,
        url: task.url,
        status: task.status?.status || "New",
        due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
        list: task.list.name,
        space: task.space.name,
        folder: task.folder?.name
      }, null, 2)
    }]
  };

  // Add sponsor message to response
  return enhanceResponseWithSponsor(response);
}

export async function handleUpdateTask(parameters: any) {
  const { taskId, taskName, listName, name, description, markdown_description, status, priority, dueDate } = parameters;
  
  let targetTaskId = taskId;
  
  // If no taskId but taskName is provided, look up the task ID
  if (!targetTaskId && taskName) {
    let listId: string | undefined;
    
    // If listName is provided, find the list ID first
    if (listName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`List "${listName}" not found`);
      }
      listId = listInfo.id;
    }
    
    // Use the improved findTaskByName method
    const foundTask = await taskService.findTaskByName(listId || '', taskName);
    
    if (!foundTask) {
      throw new Error(`Task "${taskName}" not found${listName ? ` in list "${listName}"` : ""}`);
    }
    targetTaskId = foundTask.id;
  }
  
  if (!targetTaskId) {
    throw new Error("Either taskId or taskName must be provided");
  }

  // Prepare update data
  const updateData: UpdateTaskData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (markdown_description !== undefined) updateData.markdown_description = markdown_description;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) {
    updateData.priority = priority === null ? null : (priority as TaskPriority);
  }
  if (dueDate !== undefined) {
    updateData.due_date = dueDate ? parseDueDate(dueDate) : null;
    if (dueDate && updateData.due_date) {
      updateData.due_date_time = true;
    }
  }

  // Update the task
  const task = await taskService.updateTask(targetTaskId, updateData);

  // Format response
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        id: task.id,
        name: task.name,
        url: task.url,
        status: task.status?.status || "Unknown",
        updated: true,
        due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
        list: task.list.name,
        folder: task.folder?.name
      }, null, 2)
    }]
  };
}

export async function handleMoveTask(parameters: any) {
  const { taskId, taskName, sourceListName, listId, listName } = parameters;
  
  let targetTaskId = taskId;
  let sourceListId: string | undefined;
  
  // If sourceListName is provided, find the source list ID
  if (sourceListName) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, sourceListName, 'list');
    
    if (!listInfo) {
      throw new Error(`Source list "${sourceListName}" not found`);
    }
    sourceListId = listInfo.id;
  }
  
  // If no taskId but taskName is provided, look up the task ID
  if (!targetTaskId && taskName) {
    // Find the task in the source list if specified, otherwise search all tasks
    if (sourceListId) {
      // Use the improved findTaskByName method
      const foundTask = await taskService.findTaskByName(sourceListId, taskName);
      
      if (!foundTask) {
        throw new Error(`Task "${taskName}" not found in list "${sourceListName}"`);
      }
      targetTaskId = foundTask.id;
    } else {
      // Without a source list, we need to search more broadly
      throw new Error("When using taskName, sourceListName must be provided to find the task");
    }
  }
  
  if (!targetTaskId) {
    throw new Error("Either taskId or taskName (with sourceListName) must be provided");
  }
  
  let targetListId = listId;
  
  // If no listId but listName is provided, look up the list ID
  if (!targetListId && listName) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
    
    if (!listInfo) {
      throw new Error(`Target list "${listName}" not found`);
    }
    targetListId = listInfo.id;
  }
  
  // Move the task
  const task = await taskService.moveTask(targetTaskId, targetListId);

  // Format response
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        id: task.id,
        name: task.name,
        url: task.url,
        moved: true,
        due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
        list: task.list.name,
        space: task.space.name,
        folder: task.folder?.name
      }, null, 2)
    }]
  };
}

export async function handleDuplicateTask(parameters: any) {
  const { taskId, taskName, sourceListName, listId, listName } = parameters;
  
  let targetTaskId = taskId;
  let sourceListId: string | undefined;
  
  // If sourceListName is provided, find the source list ID
  if (sourceListName) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, sourceListName, 'list');
    
    if (!listInfo) {
      throw new Error(`Source list "${sourceListName}" not found`);
    }
    sourceListId = listInfo.id;
  }
  
  // If no taskId but taskName is provided, look up the task ID
  if (!targetTaskId && taskName) {
    // Find the task in the source list if specified, otherwise search all tasks
    if (sourceListId) {
      // Use the improved findTaskByName method
      const foundTask = await taskService.findTaskByName(sourceListId, taskName);
      
      if (!foundTask) {
        throw new Error(`Task "${taskName}" not found in list "${sourceListName}"`);
      }
      targetTaskId = foundTask.id;
    } else {
      // Without a source list, we need to search more broadly
      throw new Error("When using taskName, sourceListName must be provided to find the task");
    }
  }
  
  if (!targetTaskId) {
    throw new Error("Either taskId or taskName (with sourceListName) must be provided");
  }
  
  let targetListId = listId;
  
  // If no listId but listName is provided, look up the list ID
  if (!targetListId && listName) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
    
    if (!listInfo) {
      throw new Error(`Target list "${listName}" not found`);
    }
    targetListId = listInfo.id;
  }
  
  // Duplicate the task
  const task = await taskService.duplicateTask(targetTaskId, targetListId);

  // Format response
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        id: task.id,
        name: task.name,
        url: task.url,
        duplicated: true,
        due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
        list: task.list.name,
        space: task.space.name,
        folder: task.folder?.name
      }, null, 2)
    }]
  };
}

export async function handleGetTasks(parameters: any) {
  const { 
    listId, listName, archived, page, order_by, reverse, 
    subtasks, statuses, include_closed, assignees, 
    due_date_gt, due_date_lt, date_created_gt, date_created_lt, 
    date_updated_gt, date_updated_lt, custom_fields 
  } = parameters;
  
  let targetListId = listId;
  
  // If no listId but listName is provided, look up the list ID
  if (!targetListId && listName) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
    
    if (!listInfo) {
      throw new Error(`List "${listName}" not found`);
    }
    targetListId = listInfo.id;
  }
  
  if (!targetListId) {
    throw new Error("Either listId or listName must be provided");
  }

  // Prepare filter options - remove archived as it's not in TaskFilters
  const filters: TaskFilters = {
    page,
    order_by,
    reverse,
    subtasks,
    statuses
  };

  // Get tasks with filters
  const tasks = await taskService.getTasks(targetListId, filters);

  // Format the tasks data to be more API friendly
  const formattedTasks = tasks.map(task => ({
    id: task.id,
    name: task.name,
    status: task.status?.status || 'Unknown',
    url: task.url,
    due_date: task.due_date ? formatDueDate(Number(task.due_date)) : undefined,
    due_date_raw: task.due_date,
    priority: task.priority?.priority,
    assignees: task.assignees?.map(a => a.username) || []
  }));
  
  // Format response
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        total: tasks.length,
        tasks: formattedTasks
      }, null, 2)
    }]
  };
}

export async function handleDeleteTask(parameters: any) {
  const { taskId, taskName, listName } = parameters;
  
  let targetTaskId = taskId;
  
  // If no taskId but taskName is provided, look up the task ID
  if (!targetTaskId && taskName) {
    let listId: string | undefined;
    
    // If listName is provided, find the list ID first
    if (listName) {
      const hierarchy = await workspaceService.getWorkspaceHierarchy();
      const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
      
      if (!listInfo) {
        throw new Error(`List "${listName}" not found`);
      }
      listId = listInfo.id;
    }
    
    // Now find the task
    const tasks = await taskService.getTasks(listId || '');
    const foundTask = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
    
    if (!foundTask) {
      throw new Error(`Task "${taskName}" not found${listName ? ` in list "${listName}"` : ""}`);
    }
    targetTaskId = foundTask.id;
  }
  
  if (!targetTaskId) {
    throw new Error("Either taskId or taskName must be provided");
  }

  // Get task info before deleting (for the response)
  let taskInfo;
  try {
    taskInfo = await taskService.getTask(targetTaskId);
  } catch (error) {
    // If we can't get the task info, we'll continue with deletion anyway
    console.error("Error fetching task before deletion:", error);
  }

  // Delete the task
  await taskService.deleteTask(targetTaskId);

  // Format response
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        id: targetTaskId,
        name: taskInfo?.name || "Unknown",
        deleted: true,
        list: taskInfo?.list?.name || "Unknown",
        space: taskInfo?.space?.name || "Unknown"
      }, null, 2)
    }]
  };
}

export async function handleGetTaskComments(parameters: any) {
  const { taskId, taskName, listName, start, startId } = parameters;
  
  try {
    // Call the handler with validation
    const result = await getTaskCommentsTool.handler({
      taskId,
      taskName,
      listName,
      start: start ? Number(start) : undefined,
      startId
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    // Handle and format error response with proper content array
    console.error('Error getting task comments:', error);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error.message || 'Failed to get task comments',
          taskId: taskId || null,
          taskName: taskName || null,
          listName: listName || null
        }, null, 2)
      }]
    };
  }
}

// Helper function for path extraction
export function extractPath(node: any): string {
  if (!node) return '';
  if (!node.parent) return node.name;
  return `${extractPath(node.parent)} > ${node.name}`;
}

// Helper function for path traversal
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

// After the existing tools, add the bulk tools:

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
      options: {
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
      }
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for updating multiple tasks
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
            },
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
      options: {
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
      }
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for moving multiple tasks
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
      options: {
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
      }
    },
    required: ["tasks"]
  }
};

/**
 * Tool definition for deleting multiple tasks
 */
export const deleteBulkTasksTool = {
  name: "delete_bulk_tasks",
  description: "⚠️ PERMANENTLY DELETE multiple tasks. This action cannot be undone. For each task, you MUST provide either:\n1. taskId alone (preferred and safest)\n2. taskName + listName (use with caution)",
  inputSchema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "Array of tasks to delete",
        items: {
          type: "object",
          properties: {
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
          }
        }
      },
      options: {
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
      }
    },
    required: ["tasks"]
  }
};

/**
 * Handler for bulk task creation
 */
export async function handleCreateBulkTasks(parameters: any) {
  const { listId, listName, tasks, options: rawOptions } = parameters;
  
  // Handle options parameter - may be a string that needs to be parsed
  let options = rawOptions;
  if (typeof rawOptions === 'string') {
    try {
      options = JSON.parse(rawOptions);
    } catch (error) {
      // Just use default options on parse error
      options = undefined;
    }
  }
  
  try {
    // Validate tasks parameter
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('You must provide a non-empty array of tasks to create');
    }
    
    // Resolve list ID
    const targetListId = await resolveListId(listId, listName);
    
    // Format tasks with proper data types
    const formattedTasks = tasks.map((task: any) => ({
      name: task.name,
      description: task.description,
      markdown_description: task.markdown_description,
      status: task.status,
      priority: task.priority as TaskPriority,
      due_date: task.dueDate ? parseDueDate(task.dueDate) : undefined,
      due_date_time: task.dueDate ? true : undefined
    }));
    
    // Use bulk service to create tasks
    const result = await bulkService.createTasks(
      targetListId, 
      formattedTasks,
      options as BatchProcessingOptions
    );
    
    // Format response
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: result.totals.total,
          successful: result.totals.success,
          failed: result.totals.failure,
          failures: result.failed.map(failure => ({
            task: failure.item.name,
            error: failure.error.message
          }))
        }, null, 2)
      }]
    };
    
    return enhanceResponseWithSponsor(response);
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error.message || 'Failed to create tasks in bulk',
          listId,
          listName
        }, null, 2)
      }]
    };
  }
}

/**
 * Handler for bulk task updates
 */
export async function handleUpdateBulkTasks(parameters: any) {
  const { tasks, options: rawOptions } = parameters;
  
  // Handle options parameter - may be a string that needs to be parsed
  let options = rawOptions;
  if (typeof rawOptions === 'string') {
    try {
      options = JSON.parse(rawOptions);
    } catch (error) {
      // Just use default options on parse error
      options = undefined;
    }
  }
  
  try {
    // Validate tasks parameter
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('You must provide a non-empty array of tasks to update');
    }
    
    // Process the tasks using TaskResolver
    const tasksToUpdate = await Promise.all(
      tasks.map(async (task: any) => {
        const taskId = await resolveTaskId(task.taskId, task.taskName, undefined, task.listName);
        
        // Create update data object
        const updateData: UpdateTaskData = {};
        if (task.name !== undefined) updateData.name = task.name;
        if (task.description !== undefined) updateData.description = task.description;
        if (task.markdown_description !== undefined) updateData.markdown_description = task.markdown_description;
        if (task.status !== undefined) updateData.status = task.status;
        if (task.priority !== undefined) {
          updateData.priority = task.priority === null ? null : (task.priority as TaskPriority);
        }
        if (task.dueDate !== undefined) {
          updateData.due_date = task.dueDate ? parseDueDate(task.dueDate) : null;
          if (task.dueDate && updateData.due_date) {
            updateData.due_date_time = true;
          }
        }
        
        return { id: taskId, data: updateData };
      })
    );
    
    // Use bulk service to update tasks
    const result = await bulkService.updateTasks(
      tasksToUpdate,
      options as BatchProcessingOptions
    );
    
    // Format response
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: result.totals.total,
          successful: result.totals.success,
          failed: result.totals.failure,
          failures: result.failed.map(failure => ({
            taskId: failure.item.id,
            error: failure.error.message
          }))
        }, null, 2)
      }]
    };
    
    return enhanceResponseWithSponsor(response);
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error.message || 'Failed to update tasks in bulk',
          taskCount: tasks?.length || 0
        }, null, 2)
      }]
    };
  }
}

/**
 * Handler for bulk task moves
 */
export async function handleMoveBulkTasks(parameters: any) {
  const { tasks, targetListId, targetListName, options: rawOptions } = parameters;
  
  // Handle options parameter - may be a string that needs to be parsed
  let options = rawOptions;
  if (typeof rawOptions === 'string') {
    try {
      options = JSON.parse(rawOptions);
    } catch (error) {
      // Just use default options on parse error
      options = undefined;
    }
  }
  
  try {
    // Validate tasks parameter
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('You must provide a non-empty array of tasks to move');
    }
    
    // Resolve target list ID
    const resolvedTargetListId = await resolveListId(targetListId, targetListName);
    if (!resolvedTargetListId) {
      throw new Error('Either targetListId or targetListName must be provided');
    }
    
    // Resolve task IDs
    const taskIds = await Promise.all(
      tasks.map((task: any) => resolveTaskId(task.taskId, task.taskName, undefined, task.listName))
    );
    
    // Use bulk service to move tasks
    const result = await bulkService.moveTasks(
      taskIds,
      resolvedTargetListId,
      options as BatchProcessingOptions
    );
    
    // Format response
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: result.totals.total,
          successful: result.totals.success,
          failed: result.totals.failure,
          targetList: targetListName || resolvedTargetListId,
          failures: result.failed.map(failure => ({
            taskId: failure.item,
            error: failure.error.message
          }))
        }, null, 2)
      }]
    };
    
    return enhanceResponseWithSponsor(response);
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error.message || 'Failed to move tasks in bulk',
          targetListId: targetListId || targetListName,
          taskCount: tasks?.length || 0
        }, null, 2)
      }]
    };
  }
}

/**
 * Handler for bulk task deletion
 */
export async function handleDeleteBulkTasks(parameters: any) {
  const { tasks, options: rawOptions } = parameters;
  
  // Handle options parameter - may be a string that needs to be parsed
  let options = rawOptions;
  if (typeof rawOptions === 'string') {
    try {
      options = JSON.parse(rawOptions);
    } catch (error) {
      // Just use default options on parse error
      options = undefined;
    }
  }
  
  try {
    // Validate tasks parameter
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('You must provide a non-empty array of tasks to delete');
    }
    
    // Resolve task IDs
    const taskIds = await Promise.all(
      tasks.map((task: any) => resolveTaskId(task.taskId, task.taskName, undefined, task.listName))
    );
    
    // Use bulk service to delete tasks
    const result = await bulkService.deleteTasks(
      taskIds,
      options as BatchProcessingOptions
    );
    
    // Format response
    const response = {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: result.totals.total,
          successful: result.totals.success,
          failed: result.totals.failure,
          failures: result.failed.map(failure => ({
            taskId: failure.item,
            error: failure.error.message
          }))
        }, null, 2)
      }]
    };
    
    return enhanceResponseWithSponsor(response);
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          error: error.message || 'Failed to delete tasks in bulk',
          taskCount: tasks?.length || 0
        }, null, 2)
      }]
    };
  }
} 