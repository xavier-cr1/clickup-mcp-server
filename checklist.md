# TaskService Refactoring Checklist

## Setup Phase
- [x] Create `refactor/task-service` branch
- [x] Push branch to GitHub

## Analysis Phase
- [ ] Inventory all TaskService methods
  - [ ] Document method signatures and responsibilities
  - [ ] Identify which methods are used by tools
  - [ ] Map dependencies between methods
- [ ] Identify unused or redundant methods

## Directory Structure
- [ ] Create directory structure for modular task service
  - [ ] Create `src/services/clickup/task/` directory
  - [ ] Create placeholder files for each module
    - [ ] `task-core.ts`
    - [ ] `task-search.ts` 
    - [ ] `task-attachments.ts`
    - [ ] `task-comments.ts`
    - [ ] `task-index.ts`

## Core Module Implementation
- [ ] Move basic CRUD operations to `task-core.ts`
  - [ ] Extract constructor and initialization code
  - [ ] Extract utility methods (handleError, buildTaskFilterParams)
  - [ ] Extract core task operations (getTask, createTask, updateTask, deleteTask)
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
