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
  TaskPriority,
  ClickUpTaskAttachment
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
      matchingTask = this.findMatchingTaskWithoutEmoji(tasks, normalizedSearchTerm);
    }
    
    return matchingTask || null;
  }
  
  /**
   * Find matching task with emoji characters removed
   * @param tasks List of tasks to search
   * @param searchTerm Search term (with emoji)
   * @returns Matching task or null
   */
  private findMatchingTaskWithoutEmoji(tasks: ClickUpTask[], searchTerm: string): ClickUpTask | null {
    // Remove emoji and try again (simple approximation)
    const withoutEmoji = searchTerm.replace(/[\p{Emoji}]/gu, '').trim();
    
    return tasks.find(task => {
      const taskNameWithoutEmoji = task.name.toLowerCase().replace(/[\p{Emoji}]/gu, '').trim();
      return taskNameWithoutEmoji === withoutEmoji ||
        taskNameWithoutEmoji.includes(withoutEmoji) ||
        withoutEmoji.includes(taskNameWithoutEmoji);
    }) || null;
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
        const response = await this.client.get<ClickUpTask>(`/task/${taskId}`);
        return response.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get task ${taskId}`);
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
} 