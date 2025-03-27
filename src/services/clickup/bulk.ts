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
import { TaskService } from './task.js';
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
   * Update multiple tasks efficiently
   * 
   * @param tasks Array of task IDs and update data
   * @param options Batch processing options
   * @returns Results containing successful and failed task updates
   */
  async updateTasks(
    tasks: Array<{ id: string; data: UpdateTaskData }>,
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info(`Updating ${tasks.length} tasks`, {
      batchSize: options?.batchSize,
      concurrency: options?.concurrency
    });

    try {
      return await processBatch(
        tasks,
        ({ id, data }, index) => {
          logger.debug(`Updating task ${index + 1}/${tasks.length}`, {
            taskId: id
          });
          
          // Reuse the single-task update method
          return this.taskService.updateTask(id, data);
        },
        options
      );
    } catch (error) {
      logger.error(`Failed to update tasks in bulk`, {
        taskCount: tasks.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ClickUpServiceError(
        `Failed to update tasks in bulk: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof ClickUpServiceError ? error.code : ErrorCode.UNKNOWN,
        { taskCount: tasks.length }
      );
    }
  }

  /**
   * Move multiple tasks to a different list efficiently
   * 
   * @param taskIds Array of task IDs to move
   * @param targetListId ID of the list to move tasks to
   * @param options Batch processing options
   * @returns Results containing successful and failed moves
   */
  async moveTasks(
    taskIds: string[],
    targetListId: string,
    options?: BatchProcessingOptions
  ): Promise<BatchResult<ClickUpTask>> {
    logger.info(`Moving ${taskIds.length} tasks to list ${targetListId}`, {
      batchSize: options?.batchSize,
      concurrency: options?.concurrency
    });

    try {
      // First validate that the target list exists - do this once for all tasks
      await this.taskService.validateListExists(targetListId);

      return await processBatch(
        taskIds,
        (taskId, index) => {
          logger.debug(`Moving task ${index + 1}/${taskIds.length}`, {
            taskId,
            targetListId
          });
          
          // Reuse the single-task move method
          return this.taskService.moveTask(taskId, targetListId);
        },
        options
      );
    } catch (error) {
      logger.error(`Failed to move tasks in bulk`, {
        targetListId,
        taskCount: taskIds.length,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ClickUpServiceError(
        `Failed to move tasks in bulk: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof ClickUpServiceError ? error.code : ErrorCode.UNKNOWN,
        { targetListId, taskCount: taskIds.length }
      );
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