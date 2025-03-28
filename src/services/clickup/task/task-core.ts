/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Core Module
 * 
 * Handles core operations related to tasks in ClickUp, including:
 * - Base service initialization
 * - Core utility methods
 * - Basic CRUD operations
 */

import { BaseClickUpService, ErrorCode, ClickUpServiceError, ServiceResponse } from '../base.js';
import { 
  ClickUpTask, 
  CreateTaskData, 
  UpdateTaskData, 
  TaskFilters, 
  TasksResponse,
  TaskPriority
} from '../types.js';
import { ListService } from '../list.js';
import { WorkspaceService } from '../workspace.js';

/**
 * Core TaskService class providing basic task operations
 */
export class TaskServiceCore extends BaseClickUpService {
  protected listService: ListService;
  protected workspaceService: WorkspaceService | null = null;
  
  constructor(
    apiKey: string, 
    teamId: string, 
    baseUrl?: string,
    workspaceService?: WorkspaceService
  ) {
    super(apiKey, teamId, baseUrl);
    
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
  protected handleError(error: any, message?: string): ClickUpServiceError {
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
   * Build URL parameters from task filters
   * @param filters Task filters to convert to URL parameters
   * @returns URLSearchParams object
   */
  protected buildTaskFilterParams(filters: TaskFilters): URLSearchParams {
    const params = new URLSearchParams();
    
    // Add all filters to the query parameters
    if (filters.include_closed) params.append('include_closed', String(filters.include_closed));
    if (filters.subtasks) params.append('subtasks', String(filters.subtasks));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.order_by) params.append('order_by', filters.order_by);
    if (filters.reverse) params.append('reverse', String(filters.reverse));
    
    // Array parameters
    if (filters.statuses && filters.statuses.length > 0) {
      filters.statuses.forEach(status => params.append('statuses[]', status));
    }
    if (filters.assignees && filters.assignees.length > 0) {
      filters.assignees.forEach(assignee => params.append('assignees[]', assignee));
    }
    
    // Team tasks endpoint specific parameters
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags[]', tag));
    }
    if (filters.list_ids && filters.list_ids.length > 0) {
      filters.list_ids.forEach(id => params.append('list_ids[]', id));
    }
    if (filters.folder_ids && filters.folder_ids.length > 0) {
      filters.folder_ids.forEach(id => params.append('folder_ids[]', id));
    }
    if (filters.space_ids && filters.space_ids.length > 0) {
      filters.space_ids.forEach(id => params.append('space_ids[]', id));
    }
    if (filters.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters.include_closed_lists !== undefined) params.append('include_closed_lists', String(filters.include_closed_lists));
    if (filters.include_archived_lists !== undefined) params.append('include_archived_lists', String(filters.include_archived_lists));
    if (filters.include_compact_time_entries !== undefined) params.append('include_compact_time_entries', String(filters.include_compact_time_entries));
    
    // Date filters
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
    
    return params;
  }
  
  /**
   * Extract priority value from a task
   * @param task The task to extract priority from
   * @returns TaskPriority or null
   */
  protected extractPriorityValue(task: ClickUpTask): TaskPriority | null {
    if (!task.priority || !task.priority.id) {
      return null;
    }
    
    const priorityValue = parseInt(task.priority.id);
    // Ensure it's in the valid range 1-4
    if (isNaN(priorityValue) || priorityValue < 1 || priorityValue > 4) {
      return null;
    }
    
    return priorityValue as TaskPriority;
  }
  
  /**
   * Extract task data for creation/duplication
   * @param task The source task
   * @param nameOverride Optional override for the task name
   * @returns CreateTaskData object
   */
  protected extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
    return {
      name: nameOverride || task.name,
      description: task.description || '',
      status: task.status?.status,
      priority: this.extractPriorityValue(task),
      due_date: task.due_date ? Number(task.due_date) : undefined,
      assignees: task.assignees?.map(a => a.id) || []
    };
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
   * Get a specific task by ID
   * @param taskId The ID of the task to retrieve
   * @returns The task details
   */
  async getTask(taskId: string): Promise<ClickUpTask> {
    this.logOperation('getTask', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(
          `/task/${taskId}`
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task ${taskId}`);
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
        const params = this.buildTaskFilterParams(filters);
        
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
   * Get subtasks of a specific task
   * @param taskId The ID of the parent task
   * @returns Array of subtask details
   */
  async getSubtasks(taskId: string): Promise<ClickUpTask[]> {
    this.logOperation('getSubtasks', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.get<ClickUpTask>(
          `/task/${taskId}`
        );
        
        // Return subtasks if present, otherwise empty array
        return response.data.subtasks || [];
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get subtasks for task ${taskId}`);
    }
  }

  /**
   * Get a task by its custom ID
   * @param customTaskId The custom ID of the task (e.g., "ABC-123")
   * @param listId Optional list ID to limit the search
   * @returns The task details
   */
  async getTaskByCustomId(customTaskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('getTaskByCustomId', { customTaskId, listId });
    
    try {
      return await this.makeRequest(async () => {
        // Construct the URL with optional list ID
        const url = `/task/custom_task_ids?custom_task_id=${encodeURIComponent(customTaskId)}${listId ? `&list_id=${listId}` : ''}`;
        
        const response = await this.client.get<ClickUpTask>(url);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task with custom ID ${customTaskId}`);
    }
  }

  /**
   * Update an existing task
   * @param taskId The ID of the task to update
   * @param updateData The data to update
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
   * @returns A ServiceResponse indicating success
   */
  async deleteTask(taskId: string): Promise<ServiceResponse<void>> {
    this.logOperation('deleteTask', { taskId });
    
    try {
      await this.makeRequest(async () => {
        await this.client.delete(`/task/${taskId}`);
      });
      
      return {
        success: true,
        message: `Task ${taskId} deleted successfully`
      };
    } catch (error) {
      throw this.handleError(error, `Failed to delete task ${taskId}`);
    }
  }

  /**
   * Move a task to a different list
   * @param taskId The ID of the task to move
   * @param destinationListId The ID of the destination list
   * @returns The moved task
   */
  async moveTask(taskId: string, destinationListId: string): Promise<ClickUpTask> {
    this.logOperation('moveTask', { taskId, destinationListId });
    
    try {
      return await this.makeRequest(async () => {
        const response = await this.client.post<ClickUpTask>(
          `/task/${taskId}/move_to_list/${destinationListId}`,
          {}
        );
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to move task ${taskId} to list ${destinationListId}`);
    }
  }

  /**
   * Duplicate a task, optionally to a different list
   * @param taskId The ID of the task to duplicate
   * @param listId Optional ID of the list to duplicate the task to (uses original list if omitted)
   * @returns The new duplicate task
   */
  async duplicateTask(taskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('duplicateTask', { taskId, listId });
    
    try {
      // First, get the original task details
      const originalTask = await this.getTask(taskId);
      
      // Extract task data (name, description, etc.)
      const taskData = this.extractTaskData(originalTask);
      
      // Determine which list to create the task in
      const targetListId = listId || originalTask.list.id;
      
      // Create a duplicate task in the target list
      return await this.createTask(targetListId, taskData);
    } catch (error) {
      throw this.handleError(error, `Failed to duplicate task ${taskId}`);
    }
  }

  /**
   * Validate that a list exists
   * @param listId The ID of the list to validate
   * @throws Error if list doesn't exist
   */
  async validateListExists(listId: string): Promise<void> {
    this.logOperation('validateListExists', { listId });
    
    try {
      await this.listService.getList(listId);
    } catch (error) {
      throw this.handleError(error, `List ${listId} not found or inaccessible`);
    }
  }
}
