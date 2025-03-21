# ClickUp MCP Tools Testing Checklist

This document provides a comprehensive checklist for testing all ClickUp MCP tools to ensure they're functioning correctly after code updates.

## Prerequisites

- [x] Ensure ClickUp MCP server is running
- [x] Verify API key is correctly configured
- [x] Have test workspace available with appropriate permissions

## Workspace Tools

### Retrieve Workspace Hierarchy
- [x] Call `get_workspace_hierarchy` without parameters
- [x] Verify response contains complete workspace structure (spaces, folders, lists)
- [x] Confirm sponsorship message appears in response
- [x] Verify error handling by providing invalid workspace ID (if applicable)

## Folder Tools

### Create Folder
- [x] Call `create_folder` with name and spaceId
- [x] Verify folder is created successfully
- [x] Confirm sponsorship message appears in response
- [x] Test error handling by providing invalid space ID

### Get Folder
- [x] Call `get_folder` with folderId from previous step
- [x] Verify correct folder details are returned
- [x] Confirm sponsorship message appears in response
- [x] Test using folderName + spaceId instead of folderId
- [x] Test error handling with invalid folder ID

### Update Folder
- [x] Call `update_folder` with folderId and new name
- [x] Verify folder is updated successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using folderName + spaceId instead of folderId
- [x] Test error handling with invalid folder ID

### Delete Folder
- [x] Call `delete_folder` with folderId
- [x] Verify folder is deleted successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using folderName + spaceId instead of folderId
- [x] Test error handling with invalid folder ID

## List Tools

### Create List in Space
- [x] Call `create_list` with name and spaceId
- [x] Verify list is created successfully 
- [x] Confirm sponsorship message appears in response
- [x] Test error handling by providing invalid space ID

### Create List in Folder
- [x] Call `create_list_in_folder` with name and folderId
- [x] Verify list is created successfully in folder
- [x] Confirm sponsorship message appears in response
- [x] Test using folderName + spaceId instead of folderId
- [x] Test error handling with invalid folder ID

### Get List
- [x] Call `get_list` with listId from previous step
- [x] Verify correct list details are returned
- [x] Confirm sponsorship message appears in response
- [x] Test using listName instead of listId
- [x] Test error handling with invalid list ID

### Update List
- [x] Call `update_list` with listId and new name/content
- [x] Verify list is updated successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using listName instead of listId
- [x] Test error handling with invalid list ID

### Delete List
- [x] Call `delete_list` with listId
- [x] Verify list is deleted successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using listName instead of listId
- [x] Test error handling with invalid list ID

## Task Tools (Single Operations)

### Create Task
- [x] Call `create_task` with name and listId
- [x] Verify task is created successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using listName instead of listId
- [x] Test with optional parameters (description, dueDate, priority)
- [x] Test error handling with invalid list ID

### Get Task
- [x] Call `get_task` with taskId from previous step
- [x] Verify correct task details are returned
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId
- [x] Test error handling with invalid task ID

### Update Task
- [x] Call `update_task` with taskId and new name/description
- [x] Verify task is updated successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId
- [x] Test updating different fields (status, priority, dueDate)
- [x] Test error handling with invalid task ID

### Move Task
- [x] Call `move_task` to move task to a different list
- [x] Verify task is moved successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + sourceListName instead of taskId
- [x] Test error handling with invalid task/list IDs

### Duplicate Task
- [x] Call `duplicate_task` with taskId
- [x] Verify task is duplicated successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + sourceListName instead of taskId
- [x] Test duplicating to a different list
- [x] Test error handling with invalid task ID

### Get Task Comments
- [x] Call `get_task_comments` with taskId
- [x] Verify comments are returned correctly
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId
- [x] Test pagination parameters
- [x] Test error handling with invalid task ID

### Delete Task
- [x] Call `delete_task` with taskId
- [x] Verify task is deleted successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId
- [x] Test error handling with invalid task ID

## Task Tools (Bulk Operations)

### Create Bulk Tasks
- [x] Call `create_bulk_tasks` with an array of task objects and listId
- [x] Verify all tasks are created successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using listName instead of listId
- [x] Test with various task properties
- [x] Test error handling with invalid list ID

### Update Bulk Tasks
- [x] Call `update_bulk_tasks` with an array of task objects
- [x] Verify all tasks are updated successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId in some tasks
- [x] Test error handling with invalid task IDs

### Move Bulk Tasks
- [x] Call `move_bulk_tasks` with array of tasks and target list
- [x] Verify all tasks are moved successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId in some tasks
- [x] Test error handling with invalid task/list IDs

### Delete Bulk Tasks
- [x] Call `delete_bulk_tasks` with an array of task identifiers
- [x] Verify all tasks are deleted successfully
- [x] Confirm sponsorship message appears in response
- [x] Test using taskName + listName instead of taskId in some tasks
- [x] Test error handling with invalid task IDs

## Post-Testing Cleanup

- [x] Remove any test tasks, lists, folders created during testing
- [x] Document any unexpected behaviors or issues
- [x] Verify no unexpected side effects in the workspace

## Performance Validation

- [x] Verify response times are acceptable for all operations
- [x] Confirm bulk operations handle proper pagination and limits
- [x] Test operations with larger data sets when applicable

## Error Handling Validation

- [x] Verify all tools properly handle authentication errors
- [x] Confirm rate limiting is handled correctly
- [x] Test with malformed input data
- [x] Verify error messages are clear and informative
- [x] Ensure proper error status codes are returned

## Additional Notes

- For critical production environments, perform these tests in a staging workspace first
- Consider automation of these tests for future updates
- Document any API behavior changes from previous versions 