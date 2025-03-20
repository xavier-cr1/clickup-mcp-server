/**
 * ClickUp Task Service
 * 
 * Handles all operations related to tasks in ClickUp, including:
 * - Creating tasks (single and bulk)
 * - Retrieving tasks (single or multiple)
 * - Updating tasks
 * - Deleting tasks
 * - Finding tasks by name
 */

import { AxiosError } from 'axios';
import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from './base.js';
import { 
  ClickUpTask, 
  CreateTaskData, 
  UpdateTaskData, 
  TaskFilters, 
  TasksResponse,
  ClickUpComment,
  ClickUpList,
  TaskPriority
} from './types.js';
import { ListService } from './list.js';
import { WorkspaceService } from './workspace.js';

export class TaskService extends BaseClickUpService {
  private listService: ListService;
  private workspaceService: WorkspaceService | null = null;
  
  constructor(
    apiKey: string, 
    teamId: string, 
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl);
    
    // Cache workspace service if provided
    if (workspaceService) {
      this.workspaceService = workspaceService;
      this.logOperation('constructor', { usingSharedWorkspaceService: true });
    }
    
    // Initialize list service for list lookups
    this.listService = new ListService(apiKey, teamId, baseUrl, this.workspaceService);
    
    this.logOperation('constructor', { initialized: true });
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param message Optional custom error message
   * @returns A ClickUpServiceError
   */
  private handleError(error: any, message?: string): ClickUpServiceError {
    if (error instanceof ClickUpServiceError) {
      return error;
    }
    
    return new ClickUpServiceError(
      message || `Task service error: ${error.message}`,
      ErrorCode.UNKNOWN,
      error
    );
  }

  /**
   * Create a new task in the specified list
   * @param listId The ID of the list to create the task in
   * @param taskData The data for the new task
   * @returns The created task
   */
  async createTask(listId: string, taskData: CreateTaskData): Promise<ClickUpTask> {
    this.logOperation('createTask', { listId, ...taskData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpTask>(
          `/list/${listId}/task`,
          taskData
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to create task in list ${listId}`);
    }
  }

  /**
   * Get all tasks in a list with optional filtering
   * @param listId The ID of the list to get tasks from
   * @param filters Optional filters to apply
   * @returns List of tasks matching the filters
   */
  async getTasks(listId: string, filters: TaskFilters = {}): Promise<ClickUpTask[]> {
    this.logOperation('getTasks', { listId, filters });
    
    try {
      return await this.makeRequest(async () => {
        const params = new URLSearchParams();
        
        // Add all filters to the query parameters
        if (filters.include_closed) params.append('include_closed', String(filters.include_closed));
        if (filters.subtasks) params.append('subtasks', String(filters.subtasks));
        if (filters.page) params.append('page', String(filters.page));
        if (filters.order_by) params.append('order_by', filters.order_by);
        if (filters.reverse) params.append('reverse', String(filters.reverse));
        if (filters.statuses && filters.statuses.length > 0) {
          filters.statuses.forEach(status => params.append('statuses[]', status));
        }
        if (filters.assignees && filters.assignees.length > 0) {
          filters.assignees.forEach(assignee => params.append('assignees[]', assignee));
        }
        if (filters.due_date_gt) params.append('due_date_gt', String(filters.due_date_gt));
        if (filters.due_date_lt) params.append('due_date_lt', String(filters.due_date_lt));
        if (filters.date_created_gt) params.append('date_created_gt', String(filters.date_created_gt));
        if (filters.date_created_lt) params.append('date_created_lt', String(filters.date_created_lt));
        if (filters.date_updated_gt) params.append('date_updated_gt', String(filters.date_updated_gt));
        if (filters.date_updated_lt) params.append('date_updated_lt', String(filters.date_updated_lt));
        
        // Handle custom fields if present
        if (filters.custom_fields) {
          Object.entries(filters.custom_fields).forEach(([key, value]) => {
            params.append(`custom_fields[${key}]`, String(value));
          });
        }
        
        const response = await this.client.get<TasksResponse>(
          `/list/${listId}/task?${params.toString()}`
        );
        
        return response.data.tasks;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get tasks from list ${listId}`);
    }
  }

  /**
   * Get a specific task by ID
   * @param taskId The ID of the task to retrieve
   * @returns The task details
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    this.logOperation('getTask', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(`/task/${taskId}`);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task ${taskId}`);
    }
  }

  /**
   * Update an existing task
   * @param taskId ID of the task to update
   * @param updateData Data to update on the task
   * @returns The updated task
   */
  async updateTask(taskId: string, updateData: UpdateTaskData): Promise<ClickUpTask> {
    this.logOperation('updateTask', { taskId, ...updateData });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.put<ClickUpTask>(
          `/task/${taskId}`,
          updateData
        );
        
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to update task ${taskId}`);
    }
  }

  /**
   * Delete a task
   * @param taskId The ID of the task to delete
   * @returns Success indicator
   */
  async deleteTask(taskId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteTask', { taskId });
    
    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/task/${taskId}`);
      });
      
      return {
        success: true
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete task ${taskId}`);
    }
  }

  /**
   * Find a task by name within a list
   * @param listId The list ID to search within
   * @param taskName The name of the task to find
   * @returns The task if found, otherwise null
   */
  async findTaskByName(listId: string, taskName: string): Promise<ClickUpTask | null> {
    this.logOperation('findTaskByName', { listId, taskName });
    
    try {
      const tasks = await this.getTasks(listId);
      
      // Normalize the search term
      const normalizedSearchTerm = taskName.toLowerCase().trim();
      
      // First try exact match
      let matchingTask = tasks.find(task => 
        task.name.toLowerCase().trim() === normalizedSearchTerm
      );
      
      // If no exact match, try substring match
      if (!matchingTask) {
        matchingTask = tasks.find(task => 
          task.name.toLowerCase().trim().includes(normalizedSearchTerm) ||
          normalizedSearchTerm.includes(task.name.toLowerCase().trim())
        );
      }
      
      // If still no match and there are emoji characters, try matching without emoji
      if (!matchingTask && /[\p{Emoji}]/u.test(normalizedSearchTerm)) {
        // Remove emoji and try again (simple approximation)
        const withoutEmoji = normalizedSearchTerm.replace(/[\p{Emoji}]/gu, '').trim();
        
        matchingTask = tasks.find(task => {
          const taskNameWithoutEmoji = task.name.toLowerCase().replace(/[\p{Emoji}]/gu, '').trim();
          return taskNameWithoutEmoji === withoutEmoji ||
            taskNameWithoutEmoji.includes(withoutEmoji) ||
            withoutEmoji.includes(taskNameWithoutEmoji);
        });
      }
      
      return matchingTask || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find task by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Move a task to a different list
   * @param taskId The ID of the task to move
   * @param destinationListId The ID of the list to move the task to
   * @returns The updated task
   */
  async moveTask(taskId: string, destinationListId: string): Promise<ClickUpTask> {
    this.logOperation('moveTask', { taskId, destinationListId });
    
    try {
      // First, get both the task and list info in parallel to save time
      const [originalTask, destinationList] = await Promise.all([
        this.getTask(taskId),
        this.listService.getList(destinationListId)
      ]);

      const currentStatus = originalTask.status?.status;
      const availableStatuses = destinationList.statuses?.map(s => s.status) || [];

      // Determine the appropriate status for the destination list
      let newStatus = availableStatuses.includes(currentStatus || '')
        ? currentStatus // Keep the same status if available in destination list
        : destinationList.statuses?.[0]?.status; // Otherwise use the default (first) status

      // Priority mapping: convert string priority to numeric value if needed
      let priorityValue = null;
      if (originalTask.priority) {
        // If priority.id exists and is numeric, use that
        if (originalTask.priority.id) {
          priorityValue = parseInt(originalTask.priority.id);
          // Ensure it's in the valid range 1-4
          if (isNaN(priorityValue) || priorityValue < 1 || priorityValue > 4) {
            priorityValue = null;
          }
        }
      }

      // Prepare the task data for the new list
      const taskData: CreateTaskData = {
        name: originalTask.name,
        description: originalTask.description,
        status: newStatus,
        priority: priorityValue,
        due_date: originalTask.due_date ? Number(originalTask.due_date) : undefined,
        assignees: originalTask.assignees?.map(a => a.id) || [],
        // Add any other relevant fields from the original task
      };

      // Create new task and delete old one in a single makeRequest call
      return await this.makeRequest(async () => {
        // First create the new task
        const response = await this.client.post<ClickUpTask>(
          `/list/${destinationListId}/task`,
          taskData
        );

        // Then delete the original task
        await this.client.delete(`/task/${taskId}`);

        // Add a property to indicate the task was moved
        const newTask = {
          ...response.data,
          moved: true,
          originalId: taskId
        };

        return newTask;
      });
    } catch (error) {
      throw this.handleError(error, 'Failed to move task');
    }
  }

  /**
   * Create a duplicate of an existing task
   * @param taskId The ID of the task to duplicate
   * @param listId Optional destination list ID (defaults to the same list)
   * @returns The newly created duplicate task
   */
  async duplicateTask(taskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('duplicateTask', { taskId, listId });
    
    try {
      // Get the original task to duplicate
      const originalTask = await this.getTask(taskId);
      
      // Create a copy of the task data
      const newTaskData: CreateTaskData = {
        name: `${originalTask.name} (copy)`,
        description: originalTask.description || '',
        status: originalTask.status?.status,
        priority: originalTask.priority?.id ? parseInt(originalTask.priority.id) as TaskPriority : null,
        due_date: originalTask.due_date ? new Date(originalTask.due_date).getTime() : undefined,
        assignees: originalTask.assignees?.map(a => a.id) || []
      };
      
      // Create the new task in the specified list or original list
      const targetListId = listId || originalTask.list.id;
      return await this.createTask(targetListId, newTaskData);
    } catch (error) {
      throw this.handleError(error, 'Failed to duplicate task');
    }
  }

  /**
   * Get all comments for a task
   * 
   * @param taskId ID of the task to get comments for
   * @param start Optional pagination start
   * @param startId Optional comment ID to start from
   * @returns Array of task comments
   */
  async getTaskComments(taskId: string, start?: number, startId?: string): Promise<ClickUpComment[]> {
    this.logOperation('getTaskComments', { taskId, start, startId });
    
    try {
      // Build query parameters for pagination
      const queryParams = new URLSearchParams();
      if (start !== undefined) {
        queryParams.append('start', start.toString());
      }
      if (startId) {
        queryParams.append('start_id', startId);
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await this.client.get<{ comments: ClickUpComment[] }>(
        `/task/${taskId}/comment${queryString}`
      );
      
      return response.data.comments || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to get task comments');
    }
  }

  /**
   * Validate that a list exists
   * 
   * @param listId ID of the list to validate
   * @throws ClickUpServiceError if the list doesn't exist
   */
  async validateListExists(listId: string): Promise<void> {
    this.logOperation('validateListExists', { listId });
    
    try {
      const list = await this.listService.getList(listId);
      if (!list) {
        throw new ClickUpServiceError(
          `List not found: ${listId}`,
          ErrorCode.NOT_FOUND,
          { listId }
        );
      }
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to validate list existence: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCode.UNKNOWN,
        { listId }
      );
    }
  }
} 