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
  - [ ] Identify unused or redundant methods

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
  - [ ] Test core operations

## Search Module Implementation
- [ ] Move search functionality to `task-search.ts`
  - [ ] Extract findTaskByName method
  - [ ] Extract findTasks method
  - [ ] Extract getTaskSummaries and getTaskDetails methods
  - [ ] Optimize search functionality
  - [ ] Test search operations

## Attachments Module Implementation
- [ ] Move attachment functionality to `task-attachments.ts`
  - [ ] Extract uploadTaskAttachment method
  - [ ] Extract uploadTaskAttachmentFromUrl method
  - [ ] Test attachment operations

## Comments Module Implementation
- [ ] Move comment functionality to `task-comments.ts`
  - [ ] Extract getTaskComments method
  - [ ] Extract createTaskComment method
  - [ ] Test comment operations

## Index Module Implementation
- [ ] Create unified TaskService in `task-index.ts`
  - [ ] Import functionality from all modules
  - [ ] Create interface for TaskService
  - [ ] Export complete TaskService

## Integration Testing
- [ ] Ensure all tool handlers work with refactored service
  - [ ] Test all task operations using the MCP tools
  - [ ] Verify logging is working correctly
  - [ ] Check error handling

## Code Cleanup
- [ ] Remove deprecated or unused methods
- [ ] Improve code documentation
- [ ] Add unit tests for new modules

## Final Steps
- [ ] Update import paths in other files
- [ ] Create pull request
- [ ] Document changes in changelog
