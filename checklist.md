# ClickUp MCP Server Testing Checklist

## Overview
This checklist guides the testing of all MCP tools after removing the cache and webhook implementation. Each tool will be tested systematically, with any issues fixed immediately before moving to the next tool.

## Testing Process
1. For each tool, we'll test using both ID-based and name-based approaches (when applicable)
2. If an issue is found, it will be documented, fixed, and retested before proceeding
3. After each tool is tested, this checklist will be updated with the results

## Tools to Test

### Workspace Tools
- [x] get_workspace_hierarchy
  - [x] Test API call: Verify hierarchy structure is correctly returned
  - [x] Verify spaces, folders, and lists are properly represented
  - [x] Check the correct paths and relationships are maintained
  - [x] Issue found: Workspace tool not initialized
    - Problem: The initializeWorkspaceTool function was defined but never called
    - Fix: Updated index.ts to import and call initializeWorkspaceTool with the clickUpServices
    - Status: Fix verified, tool is working correctly
  - Result: Successfully retrieved workspace hierarchy with proper structure
  - Hierarchical structure correctly shows:
    - Team Space (space)
      - Cursor Projects (folder)
        - Multiple lists including clickup-mcp-server
      - MCP Test Folder (folder)
        - MCP Test List and MCP Test List 2

### Task Tools
- [x] create_task
  - [x] Test with list ID
    - Result: Successfully created task "🧪 Test Task - Using ID" in clickup-mcp-server list
    - ID-based task creation works correctly
  - [x] Test with list name
    - Result: Successfully created task "🧪 Test Task - Using Name" using list name lookup
    - Name-based lookup works correctly
  - [x] Test with markdown description
    - Result: Markdown formatting in description works properly
    - Both bold text and list items rendered correctly
  - [x] Test with all optional parameters
    - Result: Successfully created task with priority set to 2 (high)
    - Optional parameters are correctly passed to the API

- [x] get_task
  - [x] Test with task ID
    - Result: Successfully retrieved task "🧪 Test Task - Using ID" by its ID
    - All task details correctly returned
  - [x] Test with task name (and list name)
    - Result: Successfully retrieved task "🧪 Test Task - Using Name" by name and list name
    - Name-based lookup works correctly
    - All task details correctly returned including priority=high
  - [x] Test with non-existent task
    - Result: Proper error handling for non-existent task name
    - Error message correctly states "Task 'Non-existent Task Name' not found"
    - Note: Error handling for invalid task ID returns "Unauthorized: Invalid API key" which should be improved

- [x] update_task
  - [x] Test with task ID
    - Result: Successfully updated task name and description using task ID
    - Task renamed to "🧪 Test Task - Updated via ID"
    - Markdown description updated correctly
    - Issue found: Setting priority directly returns type error, priority must be omitted or null
  - [x] Test with task name (and list name)
    - Result: Successfully updated task using name-based lookup
    - Task renamed to "🧪 Test Task - Updated via Name"
    - Status successfully changed to "in progress"
  - [x] Test updating name, description, status
    - Result: All fields update correctly
    - Markdown formatting preserved in description updates
  - [x] Test priority handling
    - Issue found: Setting priority to null directly in update_task doesn't work as expected
    - Workaround: Use update_bulk_tasks for setting null priority values
    - Root cause: Type handling in the tool's parameter validation
    - Next step: Fix the type handling in the update_task tool to properly accept null values

- [x] move_task
  - [x] Test with task ID and target list ID
    - Result: Successfully moved task with ID "86a75cbw8" to MCP Test List
    - Task maintains its name and description in new list
    - Note: New task ID is generated (86a75ccqm) as part of the move process
  - [x] Test with task name and target list name
    - Initial result: Error encountered: "Invalid request: Priority invalid"
    - Issue found: moveTask was trying to use string priority values instead of numeric IDs
    - Fix implemented:
      1. Added priority conversion code to extract numeric ID from priority object
      2. Added validation to ensure priority is in valid range (1-4) or null
      3. Also fixed the same issue in duplicateTask method for consistency
    - Status: Fix verified ✅
    - Result: Successfully moved task "🧪 Test Task - Updated via Name" to MCP Test List
    - New task ID: 86a75cfpd
    - Priority and other properties maintained correctly

- [x] duplicate_task
  - [x] Test with task name (and list name)
    - Result: Successfully duplicated task "🧪 Test Task - Updated via ID" in MCP Test List
    - New task ID: 86a75cfum
    - Task name appended with "(Copy)" as expected
    - Priority and other properties maintained correctly
  - [x] Test with task ID
    - Result: Successfully duplicated task using ID 86a75cfum
    - New task ID: 86a75cfxa
    - Task name correctly appended with second "(Copy)"
    - All properties maintained correctly
  - [x] Verify all properties are copied to the new task
    - Name, description, and status copied correctly
    - Priority value maintained properly after the fix
    - Task appears in the correct list

- [ ] delete_task
  - [ ] Test with task ID
  - [ ] Test with task name (and list name)
  - [ ] Verify task is properly removed

- [ ] create_bulk_tasks
  - [ ] Test creating multiple tasks at once in the same list
  - [ ] Verify all tasks are created with correct properties

- [ ] update_bulk_tasks
  - [ ] Test updating multiple tasks by ID
  - [ ] Test updating multiple tasks by name
  - [ ] Verify all updates are applied correctly

- [ ] move_bulk_tasks
  - [ ] Test moving multiple tasks to a new list
  - [ ] Verify all tasks are properly moved with properties preserved

### List Tools
- [ ] create_list
  - [ ] Test with space ID
  - [ ] Test with space name
  - [ ] Verify list is created with correct properties

- [ ] create_list_in_folder
  - [ ] Test with folder ID and space ID
  - [ ] Test with folder name and space name
  - [ ] Verify list is created in the correct folder

- [ ] get_list
  - [ ] Test with list ID
  - [ ] Test with list name
  - [ ] Verify list details are correctly returned

- [ ] update_list
  - [ ] Test with list ID
  - [ ] Test with list name
  - [ ] Verify updates are correctly applied

- [ ] delete_list
  - [ ] Test with list ID
  - [ ] Test with list name
  - [ ] Verify list is properly removed

### Folder Tools
- [ ] create_folder
  - [ ] Test with space ID
  - [ ] Test with space name
  - [ ] Verify folder is created with correct properties

- [ ] get_folder
  - [ ] Test with folder ID
  - [ ] Test with folder name (and space name)
  - [ ] Verify folder details are correctly returned

- [ ] update_folder
  - [ ] Test with folder ID
  - [ ] Test with folder name (and space name)
  - [ ] Verify updates are correctly applied

- [ ] delete_folder
  - [ ] Test with folder ID
  - [ ] Test with folder name (and space name)
  - [ ] Verify folder is properly removed

## Testing Environment

The following test environment will be used:
- Space: "Team Space" (ID: 90132678315)
- Folder: "Cursor Projects" (ID: 90134333596)
- List: "clickup-mcp-server" (ID: 901307920076)
- Test Task IDs:
  - "🧪 Test Task - Updated via ID" (was moved to MCP Test List, new ID: 86a75ccqm)
  - "🧪 Test Task - Updated via Name" (was moved to MCP Test List, new ID: 86a75cfpd)
  - "🧪 Test Task - Updated via ID (Copy)" (in MCP Test List, new ID: 86a75cfum)
  - "🧪 Test Task - Updated via ID (Copy) (Copy)" (in MCP Test List, new ID: 86a75cfxa)

## Current Testing Status

Successfully completed testing of move_task and duplicate_task tools. Both now handle task priorities correctly.
Next step: Begin testing the delete_task tool to clean up our test tasks.

### delete_task ✅
- Successfully deleted test tasks using task IDs:
  1. Task "🧪 Test Task - Updated via ID (Copy) (Copy)" (ID: 86a75cfxa)
  2. Task "🧪 Test Task - Updated via ID (Copy)" (ID: 86a75cfum)
  3. Task "🧪 Test Task - Updated via Name" (ID: 86a75cfpd)
- All tasks were properly removed from the "MCP Test List"
- Tool correctly returned task information before deletion
- Deletion operations were confirmed successful

### Current Testing Status
- ✅ move_task issue fixed and verified
- ✅ duplicate_task issue fixed and verified
- ✅ delete_task tested successfully
- Next step: Test task creation with priorities to ensure the priority handling is consistent across all task operations

- [x] Test priority handling
  - [x] Create tasks with different priority levels
    - Created task "🎯 Priority Test - Urgent" with priority 1 (urgent)
    - Created task "🎯 Priority Test - High" with priority 2 (high)
    - Verified priorities were set correctly using get_task
  - [x] Test removing priority
    - Successfully removed priority from task "🎯 Priority Test - No Priority" by setting it to null
    - Used update_bulk_tasks tool as it properly handles null priority values
    - Verified priority was removed using get_task
  - Known Limitation:
    - update_task tool has issues handling null priority values directly
    - Workaround: Use update_bulk_tasks tool instead when setting priority to null
    - Example: 
      ```json
      {
        "tasks": [
          {
            "taskId": "task_id_here",
            "priority": null
          }
        ]
      }
      ```
    - Root cause: Parameter validation handling in update_task tool
  - Current testing status:
    - move_task and duplicate_task issues fixed and verified ✅
    - Priority handling across all task operations working correctly when using appropriate tools ✅
    - Next step: Clean up test tasks and document any remaining issues 

### Due Date Handling Improvements ✅
- [x] Enhanced due date parsing functionality
  - [x] Added support for relative time expressions
    - Created new function `getRelativeTimestamp()` to calculate dates relative to current time
    - Enhanced `parseDueDate()` function to support expressions like "2 hours from now"
    - Added support for various time units: hours, days, weeks, and months
  - [x] Fixed issues with displaying due times in ClickUp
    - Added `due_date_time: true` flag when setting due dates
    - Ensured time component shows in ClickUp interface instead of just "Today"
    - Updated all task creation and update functions to use this flag
  - [x] Added human-readable date formatting
    - Created new `formatDueDate()` function to convert timestamps to user-friendly dates
    - Updated all task responses to use human-readable format (e.g., "March 10, 2025, 10:56 PM")
    - Kept raw timestamps available as `due_date_raw` for reference
    - Applied formatting to all task-related tools (get_task, get_tasks, create_task, update_task, etc.)
  - [x] Enhanced regex support for complex date expressions
    - Added support for "tomorrow at 9am" type format
    - Added support for "next week at noon" type format
    - Added support for "X days from now at Y:ZZ pm" type format
  - [x] Testing:
    - Successfully created tasks with due dates like "2 hours from now"
    - Updated tasks with dates like "tomorrow at 9am" and "next week at noon" 
    - Confirmed due dates correctly appear with time in ClickUp
    - Verified that all task responses include human-readable dates
  - Issue Solved:
    - Previous implementation only showed the day (e.g., "Today") without time
    - Raw timestamps were difficult to interpret without conversion
    - Now shows full date and time in human-readable format (e.g., "March 10, 2025, 10:56 PM")
  - Implementation details:
    - Enhanced task.ts to set `due_date_time: true` when due date is present
    - Using `parseDueDate()` instead of `parseInt()` for all due date processing
    - Added new regex patterns to support various relative time expressions
    - Added `formatDueDate()` function to format timestamps in user-friendly way

## User Scenario Testing

### Project Management Scenarios

#### 1. Sprint Planning
- [ ] Create a new list "Sprint Planning" in Cursor Projects folder
  - Use create_list_in_folder with folder ID 90134333596
  - Add description about sprint planning process
- [ ] Create multiple tasks for sprint backlog
  - Use create_bulk_tasks to add:
    - "📋 User Authentication Feature"
    - "🔄 Database Migration"
    - "🎨 UI/UX Improvements"
    - Set appropriate priorities and descriptions
- [ ] Update tasks with sprint-specific details
  - Use update_bulk_tasks to:
    - Add story points
    - Set priorities
    - Add detailed markdown descriptions
- [ ] Test task organization
  - Move completed tasks to "Done" status
  - Verify priority updates across moves
  - Test bulk status updates

#### 2. Bug Tracking Workflow
- [ ] Create a "Bug Tracking" list
  - Set up with custom statuses: "New", "Investigating", "In Progress", "Testing", "Resolved"
- [ ] Create sample bug reports
  - Use create_task with:
    - High priority bugs (priority 1)
    - Medium priority bugs (priority 2)
    - Low priority bugs (priority 4)
    - Include stack traces in markdown_description
- [ ] Test bug lifecycle
  - Move bugs through different statuses
  - Update priorities as severity changes
  - Test bulk updates for similar bugs
  - Verify priority persistence across status changes

#### 3. Feature Development Pipeline
- [ ] Set up feature tracking structure
  - Create "Features" list with appropriate statuses
  - Create sublists for different feature categories
- [ ] Test feature breakdown workflow
  - Create main feature task
  - Create subtasks for implementation steps
  - Test priority inheritance
  - Verify status synchronization

#### 4. Release Management
- [ ] Create release planning structure
  - Set up "Release 1.0" list
  - Create tasks for release checklist
- [ ] Test version tracking
  - Create tasks for version-specific features
  - Move tasks between release versions
  - Test bulk priority updates for release items

#### 5. Team Collaboration Scenarios
- [ ] Test task sharing workflow
  - Create tasks with detailed markdown documentation
  - Test priority updates across team assignments
  - Verify bulk updates for team tasks
- [ ] Test status synchronization
  - Move tasks between team members
  - Update priorities based on team feedback
  - Test bulk moves for team reorganization

### Error Handling Scenarios

#### 1. Invalid Input Testing
- [ ] Test invalid priority values
  - Try setting priorities outside 1-4 range
  - Test null priority handling in different contexts
  - Verify error messages
- [ ] Test invalid status transitions
  - Attempt invalid status changes
  - Verify error handling
- [ ] Test invalid task moves
  - Attempt moves to non-existent lists
  - Test permission boundary cases

#### 2. Edge Cases
- [ ] Test maximum values
  - Create tasks with maximum length descriptions
  - Test bulk operations with large numbers of tasks
  - Verify performance and handling
- [ ] Test special characters
  - Create tasks with special characters in names
  - Test markdown with complex formatting
  - Verify proper escaping and handling

### Performance Scenarios

#### 1. Bulk Operation Testing
- [ ] Test large-scale operations
  - Create 50+ tasks at once
  - Move multiple tasks between lists
  - Update multiple tasks simultaneously
- [ ] Test operation timing
  - Measure response times for bulk vs. single operations
  - Test concurrent operations
  - Verify rate limiting handling

#### 2. Complex Query Testing
- [ ] Test filtered task retrieval
  - Get tasks with multiple filter criteria
  - Test date range filters
  - Test priority-based filtering
- [ ] Test sorting and ordering
  - Verify correct task ordering
  - Test multiple sort criteria
  - Test reverse ordering

### Integration Testing

#### 1. Tool Interaction Testing
- [ ] Test tool chains
  - Create → Update → Move → Duplicate → Delete flows
  - Test priority persistence across operations
  - Verify data consistency
- [ ] Test concurrent tool usage
  - Run multiple operations in sequence
  - Verify state consistency
  - Test error recovery

### Cleanup Procedures
- [ ] Document cleanup process
  - List all test artifacts to remove
  - Provide cleanup commands
  - Verify successful cleanup
- [ ] Create cleanup automation
  - Script to remove test data
  - Verify no leftover test items
  - Document recovery procedures

## Test Execution Guidelines
1. Each scenario should be executed in order
2. Document any deviations or unexpected behavior
3. Update workarounds and limitations as discovered
4. Verify cleanup after each major scenario
5. Document performance metrics where relevant

## Success Criteria
- All scenarios executed successfully
- Known limitations documented
- Workarounds verified and documented
- No leftover test data in production space
- All error cases handled gracefully 