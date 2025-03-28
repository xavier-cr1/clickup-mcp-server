/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
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
  TaskPriority,
  ClickUpTaskAttachment,
  TeamTasksResponse,
  TaskSummary,
  WorkspaceTasksResponse,
  DetailedTaskResponse,
  ExtendedTaskFilters
} from './types.js';
import { ListService } from './list.js';
import { WorkspaceService } from './workspace.js';
import { estimateTokensFromObject, wouldExceedTokenLimit } from '../../utils/token-utils.js';
import { isNameMatch } from '../../utils/resolver-utils.js';
import { findListIDByName } from '../../tools/list.js';

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
   * Build URL parameters from task filters
   * @param filters Task filters to convert to URL parameters
   * @returns URLSearchParams object
   */
  private buildTaskFilterParams(filters: TaskFilters): URLSearchParams {
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
  private extractPriorityValue(task: ClickUpTask): TaskPriority | null {
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
  private extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData {
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
   * Find a matching task by name using different matching strategies
   * @param tasks List of tasks to search
   * @param taskName Name to search for
   * @returns Matching task or null
   */
  private findMatchingTask(tasks: ClickUpTask[], taskName: string): ClickUpTask | null {
    // Use the shared isNameMatch utility function
    return tasks.find(task => isNameMatch(task.name, taskName)) || null;
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
   * Get subtasks of a specific task
   * @param taskId The ID of the parent task
   * @returns Array of subtask details
   */
  async getSubtasks(taskId: string): Promise<ClickUpTask[]> {
    this.logOperation('getSubtasks', { taskId });
    
    try {
      return await this.makeRequest(async () => {
        // First, get the task to get its list ID
        const task = await this.getTask(taskId);
        const listId = task.list.id;
        
        // Then get all tasks from the list
        const allTasks = await this.getTasks(listId, { subtasks: true });
        
        // Filter tasks that have the specified task as parent
        return allTasks.filter(t => 
          t.parent === taskId || t.top_level_parent === taskId
        );
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get subtasks of task ${taskId}`);
    }
  }

  /**
   * Get a specific task by its custom ID
   * @param customTaskId The custom ID of the task (e.g., "DEV-1234")
   * @param listId Optional list ID to search within for better performance
   * @returns The task details
   */
  async getTaskByCustomId(customTaskId: string, listId?: string): Promise<ClickUpTask> {
    this.logOperation('getTaskByCustomId', { customTaskId, listId });
    
    try {
      return await this.makeRequest(async () => {
        // Build query with custom_task_ids=true and team_id
        const params = new URLSearchParams({ 
          custom_task_ids: 'true',
          team_id: this.teamId
        });
        
        // Use the ClickUp API endpoint for retrieving tasks by ID
        // With custom_task_ids=true parameter, it will treat the ID as a custom ID
        const response = await this.client.get<ClickUpTask>(
          `/task/${customTaskId}?${params.toString()}`
        );
        
        return response.data;
      });
    } catch (error) {
      // Enhance error message for custom ID lookups
      if (error?.response?.status === 404) {
        throw this.handleError(error, `Task with custom ID ${customTaskId} not found`);
      }
      throw this.handleError(error, `Failed to get task with custom ID ${customTaskId}`);
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
      return this.findMatchingTask(tasks, taskName);
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

      // Prepare the task data for the new list
      const taskData = this.extractTaskData(originalTask);
      taskData.status = newStatus;

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
      
      // Create a copy of the task data with "(copy)" appended to the name
      const newTaskData = this.extractTaskData(originalTask, `${originalTask.name} (copy)`);
      
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
   * Create a comment on a task
   * 
   * @param taskId ID of the task to comment on
   * @param commentText Text content of the comment
   * @param notifyAll Whether to notify all assignees
   * @param assignee Optional user ID to assign the comment to
   * @returns The created comment
   */
  async createTaskComment(
    taskId: string, 
    commentText: string, 
    notifyAll: boolean = false,
    assignee?: number | null
  ): Promise<ClickUpComment> {
    this.logOperation('createTaskComment', { taskId, commentText, notifyAll, assignee });
    
    try {
      const payload: {
        comment_text: string;
        notify_all: boolean;
        assignee?: number;
      } = {
        comment_text: commentText,
        notify_all: notifyAll
      };
      
      if (assignee) {
        payload.assignee = assignee;
      }
      
      // Make the request directly without using makeRequest for better error handling
      const response = await this.client.post(
        `/task/${taskId}/comment`,
        payload
      );
      
      // Handle different response formats from ClickUp API
      if (response.data) {
        if (response.data.comment) {
          // Standard format: { comment: ClickUpComment }
          return response.data.comment;
        } else if (response.data.id && (response.data.comment_text || response.data.comment)) {
          // Direct format: the comment object itself
          return response.data as ClickUpComment;
        } else {
          // Fallback: construct a minimal valid comment object
          return {
            id: response.data.id || `custom-${Date.now()}`,
            comment: response.data.comment || commentText,
            comment_text: response.data.comment_text || commentText,
            user: response.data.user || { id: 0, username: 'Unknown', email: '', color: '' },
            date: response.data.date || new Date().toISOString(),
            resolved: false
          } as ClickUpComment;
        }
      }
      
      throw new Error('Invalid response from ClickUp API');
    } catch (error: any) {
      // Check if comment might have been created despite error
      if (error.response?.status === 200 || error.response?.status === 201) {
        // Try to construct a comment object from what we know
        return {
          id: `fallback-${Date.now()}`,
          comment: commentText,
          comment_text: commentText, 
          user: { id: 0, username: 'Unknown', email: '', color: '' },
          date: new Date().toISOString(),
          resolved: false
        } as ClickUpComment;
      }
      
      throw this.handleError(error, 'Failed to create task comment');
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

  /**
   * Upload a file attachment to a ClickUp task
   * @param taskId The ID of the task to attach the file to
   * @param fileData The file data as a Buffer
   * @param fileName The name of the file
   * @returns Promise resolving to the attachment response from ClickUp
   */
  async uploadTaskAttachment(taskId: string, fileData: Buffer, fileName: string): Promise<ClickUpTaskAttachment> {
    this.logOperation('uploadTaskAttachment', { taskId, fileName, fileSize: fileData.length });
    
    try {
      return await this.makeRequest(async () => {
        // Create FormData for multipart/form-data upload
        const FormData = (await import('form-data')).default;
        const formData = new FormData();
        
        // Add the file to the form data
        formData.append('attachment', fileData, {
          filename: fileName,
          contentType: 'application/octet-stream' // Let ClickUp determine the content type
        });
        
        // Use the raw axios client for this request since we need to handle FormData
        const response = await this.client.post(
          `/task/${taskId}/attachment`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': this.apiKey
            }
          }
        );
        
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to upload attachment to task ${taskId}`);
    }
  }

  /**
   * Upload a file attachment to a ClickUp task from a URL
   * @param taskId The ID of the task to attach the file to
   * @param fileUrl The URL of the file to download and attach
   * @param fileName Optional file name (if not provided, it will be extracted from the URL)
   * @param authHeader Optional authorization header for the URL
   * @returns Promise resolving to the attachment response from ClickUp
   */
  async uploadTaskAttachmentFromUrl(
    taskId: string, 
    fileUrl: string, 
    fileName?: string, 
    authHeader?: string
  ): Promise<ClickUpTaskAttachment> {
    this.logOperation('uploadTaskAttachmentFromUrl', { taskId, fileUrl, fileName });
    
    try {
      return await this.makeRequest(async () => {
        // Import required modules
        const axios = (await import('axios')).default;
        const FormData = (await import('form-data')).default;
        
        // Download the file from the URL
        const headers: Record<string, string> = {};
        if (authHeader) {
          headers['Authorization'] = authHeader;
        }
        
        const response = await axios.get(fileUrl, {
          responseType: 'arraybuffer',
          headers
        });
        
        // Extract filename from URL if not provided
        const actualFileName = fileName || fileUrl.split('/').pop() || 'downloaded-file';
        
        // Create FormData for multipart/form-data upload
        const formData = new FormData();
        
        // Add the file to the form data
        formData.append('attachment', Buffer.from(response.data), {
          filename: actualFileName,
          contentType: 'application/octet-stream'
        });
        
        // Upload the file to ClickUp
        const uploadResponse = await this.client.post(
          `/task/${taskId}/attachment`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              'Authorization': this.apiKey
            }
          }
        );
        
        return uploadResponse.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to upload attachment from URL to task ${taskId}`);
    }
  }

  /**
   * Format task data for summary view
   * @param task The task to format
   * @returns TaskSummary object
   */
  private formatTaskSummary(task: ClickUpTask): TaskSummary {
    return {
      id: task.id,
      name: task.name,
      status: task.status.status,
      list: {
        id: task.list.id,
        name: task.list.name
      },
      due_date: task.due_date,
      url: task.url,
      priority: this.extractPriorityValue(task),
      tags: task.tags.map(tag => ({
        name: tag.name,
        tag_bg: tag.tag_bg,
        tag_fg: tag.tag_fg
      }))
    };
  }

  /**
   * Estimates token count for a task in JSON format
   * @param task ClickUp task
   * @returns Estimated token count
   */
  private estimateTaskTokens(task: ClickUpTask): number {
    return estimateTokensFromObject(task);
  }

  /**
   * Get filtered tasks across the entire team/workspace using tags and other filters
   * @param filters Task filters to apply including tags, list/folder/space filtering
   * @returns Either a DetailedTaskResponse or WorkspaceTasksResponse depending on detail_level
   */
  async getWorkspaceTasks(filters: ExtendedTaskFilters = {}): Promise<DetailedTaskResponse | WorkspaceTasksResponse> {
    try {
      this.logOperation('getWorkspaceTasks', { filters });
      
      const params = this.buildTaskFilterParams(filters);
      const response = await this.client.get<TeamTasksResponse>(`/team/${this.teamId}/task`, { 
        params 
      });

      const tasks = response.data.tasks;
      const totalCount = tasks.length; // Note: This is just the current page count
      const hasMore = totalCount === 100; // ClickUp returns max 100 tasks per page
      const nextPage = (filters.page || 0) + 1;

      // If the estimated token count exceeds 50,000 or detail_level is 'summary',
      // return summary format for efficiency and to avoid hitting token limits
      const TOKEN_LIMIT = 50000;
      
      // Estimate tokens for the full response
      let tokensExceedLimit = false;
      
      if (filters.detail_level !== 'summary' && tasks.length > 0) {
        // We only need to check token count if detailed was requested
        // For summary requests, we always return summary format
        
        // First check with a sample task - if one task exceeds the limit, we definitely need summary
        const sampleTask = tasks[0];
        
        // Check if all tasks would exceed the token limit
        const estimatedTokensPerTask = this.estimateTaskTokens(sampleTask);
        const estimatedTotalTokens = estimatedTokensPerTask * tasks.length;
        
        // Add 10% overhead for the response wrapper
        tokensExceedLimit = estimatedTotalTokens * 1.1 > TOKEN_LIMIT;
        
        // Double-check with more precise estimation if we're close to the limit
        if (!tokensExceedLimit && estimatedTotalTokens * 1.1 > TOKEN_LIMIT * 0.8) {
          // More precise check - build a representative sample and extrapolate
          tokensExceedLimit = wouldExceedTokenLimit(
            { tasks, total_count: totalCount, has_more: hasMore, next_page: nextPage },
            TOKEN_LIMIT
          );
        }
      }

      // Determine if we should return summary or detailed based on request and token limit
      const shouldUseSummary = filters.detail_level === 'summary' || tokensExceedLimit;

      this.logOperation('getWorkspaceTasks', { 
        totalTasks: tasks.length, 
        estimatedTokens: tasks.reduce((count, task) => count + this.estimateTaskTokens(task), 0), 
        usingDetailedFormat: !shouldUseSummary,
        requestedFormat: filters.detail_level || 'auto'
      });

      if (shouldUseSummary) {
        return {
          summaries: tasks.map(task => this.formatTaskSummary(task)),
          total_count: totalCount,
          has_more: hasMore,
          next_page: nextPage
        };
      }

      return {
        tasks,
        total_count: totalCount,
        has_more: hasMore,
        next_page: nextPage
      };
    } catch (error) {
      this.logOperation('getWorkspaceTasks', { error: error.message, status: error.response?.status });
      throw this.handleError(error, 'Failed to get workspace tasks');
    }
  }

  /**
   * Get task summaries for lightweight retrieval
   * @param filters Task filters to apply
   * @returns WorkspaceTasksResponse with task summaries
   */
  async getTaskSummaries(filters: TaskFilters = {}): Promise<WorkspaceTasksResponse> {
    return this.getWorkspaceTasks({ ...filters, detail_level: 'summary' }) as Promise<WorkspaceTasksResponse>;
  }

  /**
   * Get detailed task data
   * @param filters Task filters to apply
   * @returns DetailedTaskResponse with full task data
   */
  async getTaskDetails(filters: TaskFilters = {}): Promise<DetailedTaskResponse> {
    return this.getWorkspaceTasks({ ...filters, detail_level: 'detailed' }) as Promise<DetailedTaskResponse>;
  }

  /**
   * Unified method for finding tasks by ID or name with consistent handling of global lookup
   * 
   * This method provides a single entry point for all task lookup operations:
   * - Direct lookup by task ID (regular or custom)
   * - Lookup by task name within a specific list
   * - Global lookup by task name across the entire workspace
   * 
   * @param options Lookup options with the following parameters:
   *   - taskId: Optional task ID for direct lookup
   *   - customTaskId: Optional custom task ID for direct lookup
   *   - taskName: Optional task name to search for
   *   - listId: Optional list ID to scope the search
   *   - listName: Optional list name to scope the search
   *   - allowMultipleMatches: Whether to return all matches instead of throwing an error
   *   - useSmartDisambiguation: Whether to automatically select the most recently updated task
   *   - includeFullDetails: Whether to include full task details (true) or just task summaries (false)
   *   - includeListContext: Whether to include list/folder/space context with results
   * @returns Either a single task or an array of tasks depending on options
   * @throws Error if task cannot be found or if multiple matches are found when not allowed
   */
  async findTasks({
    taskId,
    customTaskId,
    taskName,
    listId,
    listName,
    allowMultipleMatches = false,
    useSmartDisambiguation = false,
    includeFullDetails = true,
    includeListContext = true
  }: {
    taskId?: string;
    customTaskId?: string;
    taskName?: string;
    listId?: string;
    listName?: string;
    allowMultipleMatches?: boolean;
    useSmartDisambiguation?: boolean;
    includeFullDetails?: boolean;
    includeListContext?: boolean;
  }): Promise<ClickUpTask | ClickUpTask[] | null> {
    try {
      this.logOperation('findTasks', { 
        taskId, 
        customTaskId, 
        taskName, 
        listId, 
        listName,
        allowMultipleMatches,
        useSmartDisambiguation
      });
      
      // Case 1: Direct task ID lookup (highest priority)
      if (taskId) {
        // Check if it looks like a custom ID
        if (taskId.includes('-') && /^[A-Z]+\-\d+$/.test(taskId)) {
          this.logOperation('findTasks', { detectedCustomId: taskId });
          
          try {
            // Try to get it as a custom ID first
            let resolvedListId: string | undefined;
            if (listId) {
              resolvedListId = listId;
            } else if (listName) {
              const listInfo = await findListIDByName(this.workspaceService!, listName);
              if (listInfo) {
                resolvedListId = listInfo.id;
              }
            }
            
            const foundTask = await this.getTaskByCustomId(taskId, resolvedListId);
            return foundTask;
          } catch (error) {
            // If it fails as a custom ID, try as a regular ID
            this.logOperation('findTasks', { 
              message: `Failed to find task with custom ID "${taskId}", falling back to regular ID`,
              error: error.message
            });
            return await this.getTask(taskId);
          }
        }
        
        // Regular task ID
        return await this.getTask(taskId);
      }
      
      // Case 2: Explicit custom task ID lookup
      if (customTaskId) {
        let resolvedListId: string | undefined;
        if (listId) {
          resolvedListId = listId;
        } else if (listName) {
          const listInfo = await findListIDByName(this.workspaceService!, listName);
          if (listInfo) {
            resolvedListId = listInfo.id;
          }
        }
        
        return await this.getTaskByCustomId(customTaskId, resolvedListId);
      }
      
      // Case 3: Task name lookup (requires either list context or global lookup)
      if (taskName) {
        // Case 3a: Task name + list context - search in specific list
        if (listId || listName) {
          let resolvedListId: string;
          if (listId) {
            resolvedListId = listId;
          } else {
            const listInfo = await findListIDByName(this.workspaceService!, listName!);
            if (!listInfo) {
              throw new Error(`List "${listName}" not found`);
            }
            resolvedListId = listInfo.id;
          }
          
          const foundTask = await this.findTaskByName(resolvedListId, taskName);
          if (!foundTask) {
            throw new Error(`Task "${taskName}" not found in list`);
          }
          
          return includeFullDetails ? await this.getTask(foundTask.id) : foundTask;
        }
        
        // Case 3b: Task name without list context - global lookup across workspace
        // Get lightweight task summaries for efficient first-pass filtering
        const response = await this.getTaskSummaries({});
        
        if (!this.workspaceService) {
          throw new Error("Workspace service required for global task lookup");
        }
        
        // Create an index to efficiently look up list context information
        const hierarchy = await this.workspaceService.getWorkspaceHierarchy();
        const listContextMap = new Map<string, { 
          listId: string, 
          listName: string, 
          spaceId: string, 
          spaceName: string, 
          folderId?: string, 
          folderName?: string 
        }>();
        
        // Function to recursively build list context map
        function buildListContextMap(nodes: any[], spaceId?: string, spaceName?: string, folderId?: string, folderName?: string) {
          for (const node of nodes) {
            if (node.type === 'space') {
              // Process space children
              if (node.children) {
                buildListContextMap(node.children, node.id, node.name);
              }
            } else if (node.type === 'folder') {
              // Process folder children
              if (node.children) {
                buildListContextMap(node.children, spaceId, spaceName, node.id, node.name);
              }
            } else if (node.type === 'list') {
              // Add list context to map
              listContextMap.set(node.id, {
                listId: node.id,
                listName: node.name,
                spaceId: spaceId!,
                spaceName: spaceName!,
                folderId,
                folderName
              });
            }
          }
        }
        
        // Build the context map
        buildListContextMap(hierarchy.root.children);
        
        // Find tasks that match the provided name
        const initialMatches: { id: string, task: any, listContext: any }[] = [];
        
        // Process task summaries to find initial matches
        for (const taskSummary of response.summaries) {
          if (isNameMatch(taskSummary.name, taskName)) {
            // Get list context information
            const listContext = listContextMap.get(taskSummary.list.id);
            
            if (listContext) {
              // Store task summary and context
              initialMatches.push({
                id: taskSummary.id,
                task: taskSummary,
                listContext
              });
            }
          }
        }
        
        // Handle the no matches case
        if (initialMatches.length === 0) {
          throw new Error(`Task "${taskName}" not found in any list across your workspace. Please check the task name and try again.`);
        }
        
        // Handle the single match case - we can return early if we don't need full details
        if (initialMatches.length === 1 && !useSmartDisambiguation && !includeFullDetails) {
          const match = initialMatches[0];
          
          if (includeListContext) {
            return {
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            };
          }
          
          return match.task;
        }
        
        // For multiple matches or when we need details, fetch full task info
        const fullMatches: ClickUpTask[] = [];
        
        try {
          // Process in sequence for better reliability
          for (const match of initialMatches) {
            const fullTask = await this.getTask(match.id);
            
            if (includeListContext) {
              // Enhance task with context information
              (fullTask as any).list = {
                ...fullTask.list,
                name: match.listContext.listName
              };
              
              if (match.listContext.folderId) {
                (fullTask as any).folder = {
                  id: match.listContext.folderId,
                  name: match.listContext.folderName
                };
              }
              
              (fullTask as any).space = {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              };
            }
            
            fullMatches.push(fullTask);
          }
          
          // Sort by update time for disambiguation
          if (fullMatches.length > 1) {
            fullMatches.sort((a, b) => {
              const aDate = parseInt(a.date_updated || '0', 10);
              const bDate = parseInt(b.date_updated || '0', 10);
              return bDate - aDate; // Most recent first
            });
          }
        } catch (error) {
          this.logOperation('findTasks', { 
            error: error.message, 
            message: "Failed to get detailed task information" 
          });
          
          // If detailed fetch fails, use the summaries with context info
          // This fallback ensures we still return something useful
          if (allowMultipleMatches) {
            return initialMatches.map(match => ({
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            }));
          } else {
            // For single result, return the first match
            const match = initialMatches[0];
            return {
              ...match.task,
              list: {
                id: match.listContext.listId,
                name: match.listContext.listName
              },
              folder: match.listContext.folderId ? {
                id: match.listContext.folderId,
                name: match.listContext.folderName
              } : undefined,
              space: {
                id: match.listContext.spaceId,
                name: match.listContext.spaceName
              }
            };
          }
        }
        
        // Return results based on options
        if (fullMatches.length === 1 || useSmartDisambiguation) {
          return fullMatches[0]; // Return most recently updated if multiple and smart disambiguation enabled
        } else if (allowMultipleMatches) {
          return fullMatches; // Return all matches
        } else {
          // Format error message for multiple matches
          const matchesInfo = fullMatches.map(task => {
            const listName = task.list?.name || "Unknown list";
            const folderName = (task as any).folder?.name;
            const spaceName = (task as any).space?.name || "Unknown space";
            
            const updateTime = task.date_updated 
              ? new Date(parseInt(task.date_updated, 10)).toLocaleString()
              : "Unknown date";
              
            const location = `list "${listName}"${folderName ? ` (folder: "${folderName}")` : ''} (space: "${spaceName}")`;
            return `- "${task.name}" in ${location} - Updated ${updateTime}`;
          }).join('\n');
          
          throw new Error(`Multiple tasks found with name "${taskName}":\n${matchesInfo}\n\nPlease provide list context to disambiguate or set allowMultipleMatches to true.`);
        }
      }
      
      // No valid lookup parameters provided
      throw new Error("At least one of taskId, customTaskId, or taskName must be provided");
    } catch (error) {
      if (error.message?.includes('Task "') && error.message?.includes('not found')) {
        throw error;
      }
      
      if (error.message?.includes('Multiple tasks found')) {
        throw error;
      }
      
      // Unexpected errors
      throw this.handleError(error, `Error finding task: ${error.message}`);
    }
  }
} 