# TaskService Refactoring Checklist

## Setup Phase
- [x] Create `refactor/task-service` branch
- [x] Push branch to GitHub

## Analysis Phase
- [x] Inventory all TaskService methods
  - [x] Document method signatures and responsibilities
    - Core Methods:
      - `createTask(listId: string, taskData: CreateTaskData): Promise<ClickUpTask>`
      - `getTask(taskId: string): Promise<ClickUpTask>`
      - `getTasks(listId: string, filters: TaskFilters): Promise<ClickUpTask[]>`
      - `getSubtasks(taskId: string): Promise<ClickUpTask[]>`
      - `getTaskByCustomId(customTaskId: string, listId?: string): Promise<ClickUpTask>`
      - `updateTask(taskId: string, updateData: UpdateTaskData): Promise<ClickUpTask>`
      - `deleteTask(taskId: string): Promise<ServiceResponse<void>>`
      - `moveTask(taskId: string, destinationListId: string): Promise<ClickUpTask>`
      - `duplicateTask(taskId: string, listId?: string): Promise<ClickUpTask>`
    - Search Methods:
      - `findTaskByName(listId: string, taskName: string): Promise<ClickUpTask | null>`
      - `findTasks({...}): Promise<ClickUpTask | ClickUpTask[] | null>` (~200 lines)
      - `getTaskSummaries(filters: TaskFilters): Promise<WorkspaceTasksResponse>`
      - `getTaskDetails(filters: TaskFilters): Promise<DetailedTaskResponse>`
      - `getWorkspaceTasks(filters: ExtendedTaskFilters): Promise<DetailedTaskResponse | WorkspaceTasksResponse>`
    - Attachment Methods:
      - `uploadTaskAttachment(taskId: string, fileData: Buffer, fileName: string): Promise<ClickUpTaskAttachment>`
      - `uploadTaskAttachmentFromUrl(taskId: string, fileUrl: string, fileName?: string): Promise<ClickUpTaskAttachment>` (implied from tool handlers)
    - Comment Methods:
      - `getTaskComments(taskId: string, start?: number, startId?: string): Promise<ClickUpComment[]>`
      - `createTaskComment(taskId: string, comment: string, notifyAll?: boolean, assignee?: number): Promise<ClickUpComment>` (implied from tool handlers)
    - Utility Methods:
      - `validateListExists(listId: string): Promise<void>`
      - `handleError(error: any, message?: string): ClickUpServiceError`
      - `buildTaskFilterParams(filters: TaskFilters): URLSearchParams`
      - `extractPriorityValue(task: ClickUpTask): TaskPriority | null`
      - `extractTaskData(task: ClickUpTask, nameOverride?: string): CreateTaskData`
  - [x] Identify which methods are used by tools
    - Methods directly used in handlers:
      - `createTask` (createTaskHandler)
      - `updateTask` (updateTaskHandler)
      - `moveTask` (moveTaskHandler)
      - `duplicateTask` (duplicateTaskHandler)
      - `getTask` (getTaskHandler)
      - `getTaskByCustomId` (getTaskHandler)
      - `getSubtasks` (getTaskHandler)
      - `getTasks` (getTasksHandler)
      - `findTasks` (getTaskId, findTaskByName)
      - `getTaskComments` (getTaskCommentsHandler)
      - `createTaskComment` (createTaskCommentHandler)
      - `getWorkspaceTasks` (getWorkspaceTasksHandler)
      - `deleteTask` (deleteTaskHandler)
  - [x] Map dependencies between methods
    - `findTasks` depends on: getTask, getTaskByCustomId, findTaskByName, getTaskSummaries, WorkspaceService.getWorkspaceHierarchy
    - `findTaskByName` depends on: getTasks, isNameMatch utility
    - `getTaskDetails` extends: getTaskSummaries
    - Several methods depend on: handleError, buildTaskFilterParams, validateListExists
    - `duplicateTask` depends on: getTask, extractTaskData, createTask
  - [x] Identify unused or redundant methods
    - Redundant: getTaskSummaries and getTaskDetails could be consolidated
    - Keep: extractPriorityValue (used in core and search)
    - Keep: extractTaskData (essential for task duplication)
    - Clean up: Remove duplicate implementations from old task.ts after refactor

## Directory Structure
- [x] Create directory structure for modular task service
  - [x] Create `src/services/clickup/task/` directory
  - [x] Create placeholder files for each module
    - [x] `task-core.ts`
    - [x] `task-search.ts` 
    - [x] `task-attachments.ts`
    - [x] `task-comments.ts`
    - [x] `task-index.ts`

## Core Module Implementation
- [x] Move basic CRUD operations to `task-core.ts`
  - [x] Extract constructor and initialization code
  - [x] Extract utility methods (handleError, buildTaskFilterParams)
  - [x] Extract core task operations (getTask, createTask, updateTask, deleteTask)
  - [x] Extract additional core operations (moveTask, duplicateTask, validateListExists)
  - [x] Test core operations
    - Note: Potential optimization for parallel folder/list requests

## Search Module Implementation
- [x] Move search functionality to `task-search.ts`
  - [x] Extract findTaskByName method
  - [x] Extract findTasks method
  - [x] Extract getTaskSummaries and getTaskDetails methods
  - [x] Optimize search functionality
  - [x] Test search operations
    - Note: Potential optimization for task validation caching

## Attachments Module Implementation
- [x] Move attachment functionality to `task-attachments.ts`
  - [x] Extract uploadTaskAttachment method
  - [x] Extract uploadTaskAttachmentFromUrl method
  - [x] Test attachment operations
    - Tested: base64, URL, and local file uploads

## Comments Module Implementation
- [x] Move comment functionality to `task-comments.ts`
  - [x] Extract getTaskComments method
  - [x] Extract createTaskComment method
  - [x] Test comment operations

## Tag Module Implementation
- [x] Move tag functionality to `task-tags.ts`
  - [x] Extract addTagToTask method
  - [x] Extract removeTagFromTask method
  - [x] Extract getTaskTags method
  - [x] Implement updateTaskTags method
  - [x] Test tag operations

## Custom Fields Module Implementation
- [x] Move custom fields functionality to `task-custom-fields.ts`
  - [x] Implement setCustomFieldValue method
  - [x] Implement setCustomFieldValues method
  - [x] Implement getCustomFieldValues method
  - [x] Implement getCustomFieldValue method
  - [x] Fix error handling and imports
  - [x] Test custom fields operations

## Index Module Implementation
- [x] Create unified TaskService in `task-index.ts`
  - [x] Import functionality from all modules
  - [x] Create interface for TaskService
  - [x] Export complete TaskService

## Integration Testing
- [x] Ensure all tool handlers work with refactored service
  - [x] Test all task operations using the MCP tools
  - [x] Verify logging is working correctly
  - [x] Check error handling

