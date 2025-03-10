/**
 * ClickUp Bulk Operations Service – infrastructure for bulk operations with batching, error handling, progress tracking, and configurable concurrency.
 */
import { ClickUpServiceError, ErrorCode } from './base.js';
import { AxiosError } from 'axios';

export interface BulkOperationOptions {
  batchSize?: number;      // default 10
  concurrency?: number;      // default 3
  continueOnError?: boolean; // default false
  retryCount?: number;       // default 3
  retryDelay?: number;       // default 1000
  exponentialBackoff?: boolean; // default true
  onProgress?: (completed: number, total: number, success: number, failed: number) => void;
}

export interface ProgressInfo {
  totalItems: number;
  completedItems: number;
  failedItems: number;
  currentBatch: number;
  totalBatches: number;
  percentComplete: number;
  context?: Record<string, any>;
}

export interface BulkOperationResult<T> {
  success: boolean;
  successfulItems: T[];
  failedItems: Array<{ item: any; index: number; error: Error }>;
  totalItems: number;
  successCount: number;
  failureCount: number;
}

export class BulkProcessor {
  public async processBulk<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options?: BulkOperationOptions
  ): Promise<BulkOperationResult<R>> {
    const opts: Required<BulkOperationOptions> = {
      batchSize: options?.batchSize ?? 10,
      concurrency: options?.concurrency ?? 3,
      continueOnError: options?.continueOnError ?? false,
      retryCount: options?.retryCount ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      exponentialBackoff: options?.exponentialBackoff ?? true,
      onProgress: options?.onProgress ?? (() => {})
    };

    const result: BulkOperationResult<R> = {
      success: true,
      successfulItems: [],
      failedItems: [],
      totalItems: items.length,
      successCount: 0,
      failureCount: 0
    };

    if (items.length === 0) return result;

    try {
      const totalBatches = Math.ceil(items.length / opts.batchSize);
      let processedItems = 0;
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * opts.batchSize;
        const endIdx = Math.min(startIdx + opts.batchSize, items.length);
        const batch = items.slice(startIdx, endIdx);
        const batchResults = await this.processBatch(batch, processor, startIdx, opts);

        result.successfulItems.push(...batchResults.successfulItems);
        result.failedItems.push(...batchResults.failedItems);
        result.successCount += batchResults.successCount;
        result.failureCount += batchResults.failureCount;

        if (batchResults.failureCount > 0 && !opts.continueOnError) {
          result.success = false;
          return result;
        }

        processedItems += batch.length;
        opts.onProgress(processedItems, items.length, result.successCount, result.failureCount);
      }
      result.success = result.failedItems.length === 0;
      return result;
    } catch (error) {
      const err = error as Error;
      console.error('Failed to process bulk operation:', err.message || String(error));
      result.success = false;
      return result;
    }
  }

  private async processBatch<T, R>(
    batch: T[],
    processor: (item: T, index: number) => Promise<R>,
    startIndex: number,
    opts: Required<BulkOperationOptions>
  ): Promise<BulkOperationResult<R>> {
    const result: BulkOperationResult<R> = {
      success: true,
      successfulItems: [],
      failedItems: [],
      totalItems: batch.length,
      successCount: 0,
      failureCount: 0
    };

    try {
      for (let i = 0; i < batch.length; i += opts.concurrency) {
        const concurrentBatch = batch.slice(i, Math.min(i + opts.concurrency, batch.length));
        const promises = concurrentBatch.map((item, idx) => {
          const index = startIndex + i + idx;
          return this.processWithRetry(() => processor(item, index), index, item, opts);
        });
        const results = await Promise.allSettled(promises);
        results.forEach((promiseResult, idx) => {
          const index = startIndex + i + idx;
          if (promiseResult.status === 'fulfilled') {
            result.successfulItems.push(promiseResult.value);
            result.successCount++;
          } else {
            const error = promiseResult.reason as Error;
            result.failedItems.push({ item: batch[i + idx], index, error });
            result.failureCount++;
            if (!opts.continueOnError) {
              result.success = false;
              throw new Error(`Bulk operation failed at index ${index}: ${error.message || String(error)}`);
            }
          }
        });
      }
      return result;
    } catch (error) {
      const err = error as Error;
      console.error(`Bulk operation failed: ${err.message || String(error)}`, error);
      result.success = false;
      return result;
    }
  }

  private async processWithRetry<R>(
    operation: () => Promise<R>,
    index: number,
    item: any,
    options: Required<BulkOperationOptions>
  ): Promise<R> {
    let attempts = 1;
    let lastError: Error = new Error('Unknown error');
    while (attempts <= options.retryCount) {
      try {
        return await operation();
      } catch (error) {
        const err = error as Error;
        console.warn(`Operation failed for item at index ${index}, attempt ${attempts}/${options.retryCount}: ${err.message || String(error)}`);
        lastError = err;
        if (attempts >= options.retryCount) break;
        const delay = options.exponentialBackoff
          ? options.retryDelay * Math.pow(2, attempts) + Math.random() * 1000
          : options.retryDelay * Math.pow(1.5, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      }
    }
    throw new Error(`Operation failed after ${attempts} attempts for item at index ${index}: ${lastError?.message || 'Unknown error'}`);
  }
}