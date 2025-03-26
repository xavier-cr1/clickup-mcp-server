# MCP ClickUp Tag Support - Development Checklist

## Overview
This checklist outlines the steps needed to implement tag support for the MCP ClickUp Server based on the ClickUp API.

## ClickUp API Tag-Related Endpoints
From the ClickUp API Reference, the following tag-related endpoints are available:

1. **Space Tags**
   - `GET /space/{space_id}/tags` - Get Space Tags
   - `POST /space/{space_id}/tag` - Create Space Tag
   - `PUT /space/{space_id}/tag/{tag_name}` - Edit Space Tag
   - `DELETE /space/{space_id}/tag/{tag_name}` - Delete Space Tag

2. **Task Tags**
   - `POST /task/{task_id}/tag/{tag_name}` - Add Tag To Task
   - `DELETE /task/{task_id}/tag/{tag_name}` - Remove Tag From Task

## Implementation Checklist

### 1. Type Definitions
- [x] Add/update tag-related types in `src/services/clickup/types.ts`:
  - [x] Define `ClickUpTag` interface
  - [x] Define request/response interfaces for tag operations
  - [x] Update existing types where necessary

### 2. ClickUp API Service Implementation
- [x] Create `src/services/clickup/tag.ts` to implement tag-related API calls:
  - [x] `getSpaceTags(spaceId: string)` - Get tags in a space
  - [x] `createSpaceTag(spaceId: string, tagName: string, tagBg: string, tagFg: string)` - Create a new tag
  - [x] `updateSpaceTag(spaceId: string, tagName: string, newTag: object)` - Update a tag
  - [x] `deleteSpaceTag(spaceId: string, tagName: string)` - Delete a tag
  - [x] `addTagToTask(taskId: string, tagName: string)` - Add a tag to a task
  - [x] `removeTagFromTask(taskId: string, tagName: string)` - Remove a tag from a task

### 3. Tool Implementations
- [x] Create `src/tools/tag.ts` with the following functions:
  - [x] `getSpaceTags(params: { spaceId: string } | { spaceName: string })` - Get tags in a space
  - [x] `createSpaceTag(params: { spaceId?: string, spaceName?: string, tagName: string, tagBg?: string, tagFg?: string })` - Create a new tag
  - [x] `updateSpaceTag(params: { spaceId?: string, spaceName?: string, tagName: string, newTagName?: string, tagBg?: string, tagFg?: string })` - Update a tag
  - [x] `deleteSpaceTag(params: { spaceId?: string, spaceName?: string, tagName: string })` - Delete a tag
  - [x] `addTagToTask(params: { taskId?: string, taskName?: string, listName?: string, tagName: string })` - Add a tag to a task
  - [x] `removeTagFromTask(params: { taskId?: string, taskName?: string, listName?: string, tagName: string })` - Remove a tag from a task

### 4. Integration with Existing Task Tools
- [x] Update `src/tools/task/single-operations.ts` to handle tags parameter when creating tasks
- [x] Update `src/tools/task/bulk-operations.ts` to handle tags parameter for bulk operations

### 5. Testing
- [ ] Test each tag-related API endpoint
  - [ ] Test get_space_tags
  - [ ] Test create_space_tag
  - [ ] Test update_space_tag
  - [ ] Test delete_space_tag
  - [ ] Test add_tag_to_task
  - [ ] Test remove_tag_from_task
- [ ] Test integration with task creation and updates
  - [ ] Test creating a task with tags
  - [ ] Test bulk creating tasks with tags

### 6. Documentation
- [x] Update tool descriptions to include tag functionality
- [x] Update README.md with tag support information

### 7. Final Steps
- [ ] Code review and refinement
- [x] Update changelog.md with tag support information
- [ ] Create PR for review

## Testing Plan

### Tag Operations Testing

1. **Space Tag Operations**
   - Test 1: Get all tags in a space
     ```json
     {
       "name": "get_space_tags",
       "arguments": {
         "spaceName": "Custom Space"
       }
     }
     ```
   
   - Test 2: Create a new tag
     ```json
     {
       "name": "create_space_tag",
       "arguments": {
         "spaceName": "Custom Space",
         "tagName": "testing",
         "tagBg": "#FF5733",
         "tagFg": "#FFFFFF"
       }
     }
     ```
   
   - Test 3: Update an existing tag
     ```json
     {
       "name": "update_space_tag",
       "arguments": {
         "spaceName": "Custom Space",
         "tagName": "testing",
         "newTagName": "testing-updated",
         "tagBg": "#33FF57"
       }
     }
     ```
   
   - Test 4: Delete a tag
     ```json
     {
       "name": "delete_space_tag",
       "arguments": {
         "spaceName": "Custom Space",
         "tagName": "testing-updated"
       }
     }
     ```

2. **Task Tag Operations**
   - Test 1: Add a tag to a task
     ```json
     {
       "name": "add_tag_to_task",
       "arguments": {
         "taskId": "[TASK_ID]",
         "tagName": "feature"
       }
     }
     ```
   
   - Test 2: Remove a tag from a task
     ```json
     {
       "name": "remove_tag_from_task",
       "arguments": {
         "taskId": "[TASK_ID]",
         "tagName": "feature"
       }
     }
     ```

3. **Task Creation with Tags**
   - Test 1: Create a task with tags
     ```json
     {
       "name": "create_task",
       "arguments": {
         "listName": "MCP Development",
         "name": "🏷️ Test task with tags",
         "tags": ["feature", "testing"]
       }
     }
     ```
   
   - Test 2: Create multiple tasks with tags
     ```json
     {
       "name": "create_bulk_tasks",
       "arguments": {
         "listName": "MCP Development",
         "tasks": [
           {
             "name": "🏷️ Task 1 with tags",
             "tags": ["feature"]
           },
           {
             "name": "🏷️ Task 2 with tags",
             "tags": ["testing"]
           }
         ]
       }
     }
     ```

## Implementation Strategy
1. ✅ Start with read operations (getSpaceTags)
2. ✅ Implement task tag operations (add/remove)
3. ✅ Implement space tag management (create/update/delete)
4. ✅ Finally, implement integration with task management tools

## Priority
1. ✅ High: Task tag operations (add/remove tags to tasks)
2. ✅ Medium: Space tag operations (get/create/update/delete) 