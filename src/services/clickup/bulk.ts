/**
 * SPDX-FileCopyrightText: © 2025 Talib Kareem <taazkareem@icloud.com>
 * SPDX-License-Identifier: MIT
 *
 * ClickUp Bulk Service
 * 
 * Enhanced implementation for bulk operations that leverages the existing single-operation methods.
 * This approach reduces code duplication while offering powerful concurrency management.
 */
import { ClickUpServiceError, ErrorCode } from './base.js';
import { TaskService } from './task/index.js';
import { CreateTaskData, ClickUpTask, UpdateTaskData } from './types.js';
import { BatchProcessingOptions, BatchResult, processBatch } from '../../utils/concurrency-utils.js';
import { Logger } from '../../logger.js';

// Create logger instance
const logger = new Logger('BulkService');

/**
 * Service for handling bulk operations in ClickUp
 */
export class BulkService {
  private taskService: TaskService;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
    logger.info('BulkService initialized');
  }

  /**
   * Create multiple tasks in a list efficiently
   * 
   * @param listId ID of the list to create tasks in
   * @param tasks Array of task data
   * @param options Batch processing options
   * @returns Results containing successful and failed tasks
   */
  async createTasks(
    listId: string,
    tasks: CreateTaskData[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info(`Creating ${tasks.length} tasks in list ${listId}`, {
      batchSize: options?.batchSize,
      concurrency: options?.concurrency
    });

    try {
      // First validate that the list exists - do this once for all tasks
      await this.taskService.validateListExists(listId);

      // Process the tasks in batches
      return await processBatch(
        tasks,
        (task, index) => {
          logger.debug(`Creating task ${index + 1}/${tasks.length}`, {
            taskName: task.name
          });
          
          // Reuse the single-task creation method
          return this.taskService.createTask(listId, task);
        },
        options
      );
    } catch (error) {
      logger.error(`Failed to create tasks in bulk`, {
        listId,
        taskCount: tasks.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ClickUpServiceError(
        `Failed to create tasks in bulk: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof ClickUpServiceError ? error.code : ErrorCode.UNKNOWN,
        { listId, taskCount: tasks.length }
      );
    }
  }

  /**
   * Update multiple tasks
   * @param tasks Array of tasks to update with their new data
   * @param options Optional batch processing settings
   * @returns Array of updated tasks
   */
  async updateTasks(
    tasks: (UpdateTaskData & { taskId?: string; taskName?: string; listName?: string; customTaskId?: string })[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info('Starting bulk update operation', { taskCount: tasks.length });
    
    try {
      // Extract all task IDs that need validation
      const taskIds = tasks
        .map(task => task.taskId)
        .filter((id): id is string => !!id);

      // Validate all tasks exist in parallel
      if (taskIds.length > 0) {
        await this.taskService.validateTasksExist(taskIds);
      }

      // Process updates in batches
      return await processBatch(
        tasks,
        async (task) => {
          const { taskId, taskName, listName, customTaskId, ...updateData } = task;
          
          if (taskId) {
            return await this.taskService.updateTask(taskId, updateData);
          } else if (customTaskId) {
            const resolvedTask = await this.taskService.getTaskByCustomId(customTaskId);
            return await this.taskService.updateTask(resolvedTask.id, updateData);
          } else if (taskName && listName) {
            // For tasks identified by name, we need to resolve the ID first
            const taskList = await this.taskService.getTasks(listName);
            const matchingTask = taskList.find(t => t.name === taskName);
            if (!matchingTask) {
              throw new ClickUpServiceError(
                `Task "${taskName}" not found in list "${listName}"`,
                ErrorCode.NOT_FOUND
              );
            }
            return await this.taskService.updateTask(matchingTask.id, updateData);
          } else {
            throw new ClickUpServiceError(
              'Invalid task identification. Provide either taskId, customTaskId, or both taskName and listName',
              ErrorCode.INVALID_PARAMETER
            );
          }
        },
        options
      );
    } catch (error) {
      logger.error('Bulk update operation failed', error);
      throw error;
    }
  }

  /**
   * Move multiple tasks to a different list
   * @param tasks Array of tasks to move (each with taskId or taskName + listName)
   * @param targetListId ID of the destination list
   * @param options Optional batch processing settings
   * @returns Array of moved tasks
   */
  async moveTasks(
    tasks: { taskId?: string; taskName?: string; listName?: string; customTaskId?: string }[],
    targetListId: string,
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info('Starting bulk move operation', { taskCount: tasks.length, targetListId });
    
    try {
      // First validate the destination list exists
      await this.taskService.validateListExists(targetListId);

      // Extract all task IDs that need validation
      const taskIds = tasks
        .map(task => task.taskId)
        .filter((id): id is string => !!id);

      // Validate all tasks exist in parallel
      if (taskIds.length > 0) {
        await this.taskService.validateTasksExist(taskIds);
      }

      // Process moves in batches
      return await processBatch(
        tasks,
        async (task) => {
          if (task.taskId) {
            return await this.taskService.moveTask(task.taskId, targetListId);
          } else if (task.customTaskId) {
            const resolvedTask = await this.taskService.getTaskByCustomId(task.customTaskId);
            return await this.taskService.moveTask(resolvedTask.id, targetListId);
          } else if (task.taskName && task.listName) {
            // For tasks identified by name, we need to resolve the ID first
            const taskList = await this.taskService.getTasks(task.listName);
            const matchingTask = taskList.find(t => t.name === task.taskName);
            if (!matchingTask) {
              throw new ClickUpServiceError(
                `Task "${task.taskName}" not found in list "${task.listName}"`,
                ErrorCode.NOT_FOUND
              );
            }
            return await this.taskService.moveTask(matchingTask.id, targetListId);
          } else {
            throw new ClickUpServiceError(
              'Invalid task identification. Provide either taskId, customTaskId, or both taskName and listName',
              ErrorCode.INVALID_PARAMETER
            );
          }
        },
        options
      );
    } catch (error) {
      logger.error('Bulk move operation failed', error);
      throw error;
    }
  }

  /**
   * Delete multiple tasks efficiently
   * 
   * @param taskIds Array of task IDs to delete
   * @param options Batch processing options
   * @returns Results containing successful and failed deletions
   */
  async deleteTasks(
    taskIds: string[],
    options?: BatchProcessingOptions
  ): Promise<BatchResult<string>> {
    logger.info(`Deleting ${taskIds.length} tasks`, {
      batchSize: options?.batchSize,
      concurrency: options?.concurrency
    });

    try {
      return await processBatch(
        taskIds,
        async (taskId, index) => {
          logger.debug(`Deleting task ${index + 1}/${taskIds.length}`, {
            taskId
          });
          
          // Reuse the single-task delete method
          await this.taskService.deleteTask(taskId);
          return taskId; // Return the ID for successful deletions
        },
        options
      );
      } catch (error) {
      logger.error(`Failed to delete tasks in bulk`, {
        taskCount: taskIds.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ClickUpServiceError(
        `Failed to delete tasks in bulk: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof ClickUpServiceError ? error.code : ErrorCode.UNKNOWN,
        { taskCount: taskIds.length }
      );
    }
  }
}