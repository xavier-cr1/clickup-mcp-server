/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Task Service - Search Module
 * 
 * Handles search and lookup operations for tasks in ClickUp, including:
 * - Finding tasks by name
 * - Global workspace task lookup
 * - Task summaries and detailed task data
 */

import { TaskServiceCore } from './task-core.js';
import { 
  ClickUpTask, 
  TaskFilters, 
  TaskSummary,
  WorkspaceTasksResponse,
  DetailedTaskResponse,
  TeamTasksResponse,
  ExtendedTaskFilters,
  UpdateTaskData
} from '../types.js';
import { isNameMatch } from '../../../utils/resolver-utils.js';
import { findListIDByName } from '../../../tools/list.js';
import { estimateTokensFromObject, wouldExceedTokenLimit } from '../../../utils/token-utils.js';

/**
 * Search functionality for the TaskService
 */
export class TaskServiceSearch extends TaskServiceCore {
  /**
   * Find a task by name within a specific list
   * @param listId The ID of the list to search in
   * @param taskName The name of the task to find
   * @returns The task if found, otherwise null
   */
  async findTaskByName(listId: string, taskName: string): Promise<ClickUpTask | null> {
    this.logOperation('findTaskByName', { listId, taskName });
    
    try {
      const tasks = await this.getTasks(listId);
      // Find task by exact match first, then case-insensitive, then substring
      // Exact match
      let match = tasks.find(task => task.name === taskName);
      if (match) return match;
      
      // Case-insensitive match
      match = tasks.find(task => 
        task.name.toLowerCase() === taskName.toLowerCase()
      );
      if (match) return match;
      
      // Substring match
      match = tasks.find(task => 
        task.name.toLowerCase().includes(taskName.toLowerCase())
      );
      
      return match || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find task by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Formats a task into a lightweight summary format
   * @param task The task to format
   * @returns A TaskSummary object
   */
  protected formatTaskSummary(task: ClickUpTask): TaskSummary {
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
  protected estimateTaskTokens(task: ClickUpTask): number {
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
      const response = await this.makeRequest(async () => {
        return await this.client.get<TeamTasksResponse>(`/team/${this.teamId}/task`, { 
          params 
        });
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
   * - Direct lookup by task ID (highest priority)
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
          
          // If includeFullDetails is true and we need context not already in the task,
          // get full details, otherwise return what we already have
          if (includeFullDetails && (!foundTask.list || !foundTask.list.name || !foundTask.status)) {
            return await this.getTask(foundTask.id);
          }
          
          return foundTask;
        }
        
        // Case 3b: Task name without list context - global lookup across workspace
        // Get lightweight task summaries for efficient first-pass filtering
        this.logOperation('findTasks', { 
          message: `Starting global task search for "${taskName}"`,
          includeFullDetails,
          useSmartDisambiguation 
        });
        
        // Use statuses parameter to get both open and closed tasks
        // Include additional filters to ensure we get as many tasks as possible
        const response = await this.getTaskSummaries({
          include_closed: true,
          include_archived_lists: true,
          include_closed_lists: true,
          subtasks: true
        });
        
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
        let taskCount = 0;
        let matchesFound = 0;
        
        // Add additional logging to debug task matching
        this.logOperation('findTasks', { 
          total_tasks_in_response: response.summaries.length,
          search_term: taskName
        });
        
        for (const taskSummary of response.summaries) {
          taskCount++;
          
          // Use isNameMatch for consistent matching behavior
          const isMatch = isNameMatch(taskSummary.name, taskName);
          
          // For debugging, log every 20th task or any task with a similar name
          if (taskCount % 20 === 0 || taskSummary.name.toLowerCase().includes(taskName.toLowerCase()) || 
              taskName.toLowerCase().includes(taskSummary.name.toLowerCase())) {
            this.logOperation('findTasks:matching', { 
              task_name: taskSummary.name,
              search_term: taskName,
              list_name: taskSummary.list?.name || 'Unknown list',
              is_match: isMatch
            });
          }
          
          if (isMatch) {
            matchesFound++;
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
        
        this.logOperation('findTasks', { 
          globalSearch: true, 
          searchTerm: taskName,
          tasksSearched: taskCount,
          matchesFound: matchesFound,
          validMatchesWithContext: initialMatches.length
        });
        
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

  /**
   * Update a task by name within a specific list
   * @param listId The ID of the list containing the task
   * @param taskName The name of the task to update
   * @param updateData The data to update the task with
   * @returns The updated task
   */
  async updateTaskByName(listId: string, taskName: string, updateData: UpdateTaskData): Promise<ClickUpTask> {
    this.logOperation('updateTaskByName', { listId, taskName, ...updateData });
    
    try {
      const task = await this.findTaskByName(listId, taskName);
      if (!task) {
        throw new Error(`Task "${taskName}" not found in list ${listId}`);
      }
      
      return await this.updateTask(task.id, updateData);
    } catch (error) {
      throw this.handleError(error, `Failed to update task by name: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

