# ClickUp MCP Server Test Plan

## 🎯 Objective
This test plan evaluates all tools in the ClickUp MCP Server through diverse, natural language prompts simulating practical usage scenarios. Each test case includes verification methods.

## 📋 Test Data Preparation
Before executing the tests, you must generate the necessary test data in your ClickUp workspace:

1. **Create Test Spaces, Folders, and Lists**:
   - Create at least one space in each category (e.g., Development, Marketing, Design, QA)
   - Create folders within these spaces
   - Create lists within spaces and folders

2. **Create Test Tasks**:
   - Add several tasks with various properties (priorities, due dates, descriptions)
   - Create tasks with comments
   - Add tags to some tasks

3. **Update Test Plan with Actual IDs**:
   - Replace all placeholder IDs (e.g., "123456789") with actual IDs from your workspace
   - Update all task names, list names, folder names, and space names to match your actual data
   - Make sure all referenced entities actually exist in your workspace before testing

## 🧪 Test Cases

### Workspace

#### Tool Name: `get_workspace_hierarchy`
- **Objective:** Retrieve the complete workspace hierarchy including spaces, folders, and lists.
- **Prompts:**
  1. "Show me the entire workspace structure"
  2. "Get my ClickUp workspace hierarchy"
  3. "What spaces, folders and lists do I have in my workspace?"
- **Expected Behavior:** Returns a structured JSON with all spaces, folders, and lists with their respective IDs.
- **Verification Method:** Check that the returned data includes spaces with folders and lists in a hierarchical structure.

### Task (Single Operations)

#### Tool Name: `create_task`
- **Objective:** Create a single task in a specified list.
- **Prompts:**
  1. "Create a task called '🚀 Implement login feature' in the Development list"
  2. "Add a new task to the Marketing list with the name '📊 Review Q2 analytics' due next Friday"
  3. "Create a high priority task in the Design list called '🎨 Update homepage mockups' with the description 'Focus on mobile responsiveness'"
  4. "Add a bug task in the QA list using the listId '123456789' with custom fields for browser and severity"
  5. "Create a subtask under task 123456789 named '📝 Update documentation'"
- **Expected Behavior:** Successfully creates task with specified parameters and returns the created task data including ID.
- **Verification Method:** Use `get_task` with the returned ID to verify all properties were set correctly.

#### Tool Name: `get_task`
- **Objective:** Retrieve detailed information about a specific task.
- **Prompts:**
  1. "Show me details for task 123456789"
  2. "Get information about the task named 'Website redesign'"
  3. "Find task 987654321 in the Development list"
  4. "Show details of task 123456789 including all subtasks"
  5. "What's the status of the task called 'Quarterly report'?"
- **Expected Behavior:** Returns comprehensive task data including name, status, description, due date, etc.
- **Verification Method:** Verify that all expected task fields are present in the response, including custom fields.

#### Tool Name: `update_task`
- **Objective:** Modify properties of an existing task.
- **Prompts:**
  1. "Change the status of task 123456789 to 'In Progress'"
  2. "Update the due date for 'Website migration' to next Monday"
  3. "Add a markdown description to task 123456789 with '## Meeting Notes\n- Discussed key features\n- Set Q3 goals'"
  4. "Set the priority of task 'Bug fix' to urgent"
  5. "Rename task 987654321 to '🔄 Refactor authentication service'"
- **Expected Behavior:** Updates the specified task fields and returns the updated task.
- **Verification Method:** Use `get_task` to verify the changes were applied correctly.

#### Tool Name: `move_task`
- **Objective:** Move a task from one list to another.
- **Prompts:**
  1. "Move task 123456789 to the QA list"
  2. "Transfer 'Homepage redesign' task from Design to Development list"
  3. "Move task 123456789 to list 987654321"
  4. "Shift the 'Security audit' task to the 'Urgent' list"
- **Expected Behavior:** Relocates the task to the specified list and returns confirmation.
- **Verification Method:** Use `get_task` to verify the task's listId has changed to the target list.

#### Tool Name: `duplicate_task`
- **Objective:** Create a copy of an existing task.
- **Prompts:**
  1. "Duplicate task 123456789"
  2. "Make a copy of 'Quarterly review' in the same list"
  3. "Clone task 123456789 to the 'Campaign Ideas' list"
  4. "Create a duplicate of task 123456789 in list 987654321"
- **Expected Behavior:** Creates a new task with identical properties to the original and returns the new task data.
- **Verification Method:** Compare the duplicated task with the original using `get_task` to ensure properties match.

#### Tool Name: `delete_task`
- **Objective:** Permanently remove a task.
- **Prompts:**
  1. "Delete task 123456789"
  2. "Remove the 'Outdated feature' task from the Development list"
  3. "Permanently delete task 123456789"
  4. "Delete the task named 'Old campaign' if it exists"
  5. "Remove a non-existent task 999999999"
- **Expected Behavior:** Successfully deletes the task if it exists and returns confirmation. For non-existent tasks, returns appropriate error.
- **Verification Method:** Use `get_task` to confirm the task no longer exists.

#### Tool Name: `get_tasks`
- **Objective:** Retrieve all tasks from a specific list.
- **Prompts:**
  1. "Show all tasks in the Development list"
  2. "Get tasks from list 123456789"
  3. "Retrieve all items in the 'Backlog' list"
  4. "Show incomplete tasks in the 'Current Sprint' list"
  5. "Find all tasks in a non-existent list"
- **Expected Behavior:** Returns an array of tasks from the specified list with their details.
- **Verification Method:** Check that the returned data structure contains tasks with the expected fields and proper list association.

#### Tool Name: `get_task_comments`
- **Objective:** Retrieve comments associated with a specific task.
- **Prompts:**
  1. "Show comments for task 123456789"
  2. "Get all comment history on 'Website redesign' task"
  3. "Retrieve the latest comments from task 123456789"
  4. "Show communication thread on task 987654321"
  5. "Get comments for a task that has no comments"
- **Expected Behavior:** Returns an array of comments with author, content, and timestamp details.
- **Verification Method:** Verify the structure of returned comments and confirm they belong to the specified task.

#### Tool Name: `create_task_comment`
- **Objective:** Add a comment to a specific task.
- **Prompts:**
  1. "Add comment 'Fixed the bug in login flow' to task 123456789"
  2. "Comment on 'Website redesign' task: 'Client approved the mockups'"
  3. "Post update 'Meeting scheduled for Thursday 2pm' on task 123456789"
  4. "Add feedback to task 123456789: 'Please review the latest changes'"
  5. "Comment on a non-existent task 999999999"
- **Expected Behavior:** Successfully adds the comment to the task and returns the created comment data.
- **Verification Method:** Use `get_task_comments` to verify the comment was added correctly.

### Task (Bulk Operations)

#### Tool Name: `create_bulk_tasks`
- **Objective:** Create multiple tasks in a single list simultaneously.
- **Prompts:**
  1. "Create 3 tasks in the Development list: '🚀 Setup API', '🔒 Implement authentication', and '📱 Build mobile view'"
  2. "Add multiple tasks to the Marketing list: '📊 Create analytics report' due next Monday, '📧 Draft email campaign' due Wednesday, and '🎨 Design social media assets'"
  3. "Bulk create 5 bug tasks in the QA list with high priority"
  4. "Create several tasks in list 123456789 with custom fields for each"
  5. "Add tasks to a non-existent list"
- **Expected Behavior:** Creates all specified tasks in the target list and returns data for all created tasks.
- **Verification Method:** Use `get_tasks` to verify all tasks were created with correct properties.

#### Tool Name: `update_bulk_tasks`
- **Objective:** Modify properties of multiple tasks simultaneously.
- **Prompts:**
  1. "Change status to 'In Progress' for tasks 123456789, 234567890, and 345678901"
  2. "Update priority to high for all tasks in the 'Current Sprint' list"
  3. "Set due date to next Friday for tasks 123456789, 234567890, and 345678901"
  4. "Add the tag 'needs-review' to 5 specific tasks in the QA list"
  5. "Change assignee for multiple tasks including some that don't exist"
- **Expected Behavior:** Updates all specified tasks with the desired properties and returns data for the updated tasks.
- **Verification Method:** Use `get_task` for multiple tasks to verify changes were applied correctly.

#### Tool Name: `move_bulk_tasks`
- **Objective:** Move multiple tasks to a different list simultaneously.
- **Prompts:**
  1. "Move tasks 123456789, 234567890, and 345678901 to the 'Completed' list"
  2. "Transfer all 'bug' tasks from 'Development' to 'QA' list"
  3. "Move tasks 123456789, 234567890, and 345678901 to list 987654321"
  4. "Shift all high priority tasks from 'Backlog' to 'Current Sprint'"
  5. "Move several tasks including some that don't exist to a target list"
- **Expected Behavior:** Relocates all specified tasks to the target list and returns confirmation.
- **Verification Method:** Use `get_tasks` on the target list to verify all tasks were moved correctly.

#### Tool Name: `delete_bulk_tasks`
- **Objective:** Permanently remove multiple tasks simultaneously.
- **Prompts:**
  1. "Delete tasks 123456789, 234567890, and 345678901"
  2. "Remove all completed tasks from the 'Archive' list"
  3. "Permanently delete tasks 123456789, 234567890, and 345678901"
  4. "Delete all low priority tasks from the 'Backlog' list"
  5. "Remove several tasks including some that don't exist"
- **Expected Behavior:** Deletes all specified existing tasks and returns confirmation, with appropriate errors for non-existent tasks.
- **Verification Method:** Use `get_task` for multiple tasks to confirm they no longer exist.

### Task (Workspace Operations)

#### Tool Name: `get_workspace_tasks`
- **Objective:** Retrieve tasks from across the entire workspace with filtering options.
- **Prompts:**
  1. "Show all tasks tagged with 'urgent' across the workspace"
  2. "Find all tasks assigned to John in any list"
  3. "Get all tasks due this week across all projects"
  4. "Show all tasks with 'bug' in their name from any list"
  5. "Find all tasks created in the last 30 days with high priority"
- **Expected Behavior:** Returns filtered tasks from across the workspace matching the specified criteria.
- **Verification Method:** Verify that returned tasks match the filter criteria and represent data from multiple lists.

### Task (Attachments)

#### Tool Name: `attach_task_file`
- **Objective:** Add a file attachment to a specific task.
- **Prompts:**
  1. "Attach a screenshot to task 123456789"
  2. "Upload requirements.pdf to the 'Project plan' task"
  3. "Add design mockups from URL https://example.com/design.png to task 123456789"
  4. "Attach local file /path/to/document.docx to task 987654321"
  5. "Upload a large file to task 123456789 using chunked upload"
- **Expected Behavior:** Successfully attaches the file to the task and returns confirmation with file metadata.
- **Verification Method:** Verify the attachment appears in the task's attachments when retrieved with `get_task`.

### List

#### Tool Name: `create_list`
- **Objective:** Create a new list within a ClickUp space.
- **Prompts:**
  1. "Create a list called 'Q3 Projects' in the Development space"
  2. "Add a new list 'Marketing Campaigns' to space 123456789"
  3. "Create list 'Design Tasks' in Marketing space with description 'All design tasks for Q3 campaigns'"
  4. "Set up a 'Bug Tracking' list in the QA space with high priority"
  5. "Create a list in a non-existent space"
- **Expected Behavior:** Successfully creates the list in the specified space and returns the list data including ID.
- **Verification Method:** Use `get_list` to verify the list was created with correct properties.

#### Tool Name: `create_list_in_folder`
- **Objective:** Create a new list within a specific folder.
- **Prompts:**
  1. "Create a list called 'Sprint 22' in the 'Active Sprints' folder"
  2. "Add a 'Feature Requests' list to the Product folder in Development space"
  3. "Create list 'Social Media Content' in folder 123456789"
  4. "Set up 'Documentation' list in the 'Resources' folder with description 'All product documentation'"
  5. "Create a list in a non-existent folder"
- **Expected Behavior:** Successfully creates the list in the specified folder and returns the list data including ID.
- **Verification Method:** Use `get_list` to verify the list was created in the correct folder with proper properties.

#### Tool Name: `get_list`
- **Objective:** Retrieve details about a specific list.
- **Prompts:**
  1. "Show details for list 'Current Sprint'"
  2. "Get information about list 123456789"
  3. "Retrieve properties of the 'Marketing Campaigns' list"
  4. "What tasks are in the 'Bug Fixes' list?"
  5. "Get details for a non-existent list"
- **Expected Behavior:** Returns comprehensive list data including name, content, and associated tasks.
- **Verification Method:** Verify that all expected list fields are present in the response.

#### Tool Name: `update_list`
- **Objective:** Modify properties of an existing list.
- **Prompts:**
  1. "Rename list 'Backlog' to 'Product Backlog'"
  2. "Update the description of list 123456789 to 'High priority tasks for Q3'"
  3. "Change the status of 'Current Sprint' list to 'In Progress'"
  4. "Update content and name of the 'Bug Fixes' list"
  5. "Modify a non-existent list"
- **Expected Behavior:** Updates the specified list fields and returns the updated list data.
- **Verification Method:** Use `get_list` to verify the changes were applied correctly.

#### Tool Name: `delete_list`
- **Objective:** Permanently remove a list and all its tasks.
- **Prompts:**
  1. "Delete list 'Archived Projects'"
  2. "Remove list 123456789 completely"
  3. "Permanently delete the 'Old Campaigns' list"
  4. "Delete all tasks in the 'Completed' list by removing the list"
  5. "Remove a non-existent list"
- **Expected Behavior:** Successfully deletes the list if it exists and returns confirmation. For non-existent lists, returns appropriate error.
- **Verification Method:** Attempt to use `get_list` to confirm the list no longer exists.

### Folder

#### Tool Name: `create_folder`
- **Objective:** Create a new folder within a ClickUp space.
- **Prompts:**
  1. "Create a folder called 'Q3 Initiatives' in the Development space"
  2. "Add a new folder 'Campaign Materials' to the Marketing space"
  3. "Create folder 'Active Projects' in space 123456789 with custom statuses"
  4. "Set up a 'Resources' folder in the Design space"
  5. "Create a folder in a non-existent space"
- **Expected Behavior:** Successfully creates the folder in the specified space and returns the folder data including ID.
- **Verification Method:** Use `get_folder` to verify the folder was created with correct properties.

#### Tool Name: `get_folder`
- **Objective:** Retrieve details about a specific folder.
- **Prompts:**
  1. "Show details for folder 'Active Sprints'"
  2. "Get information about folder 123456789"
  3. "Retrieve properties of the 'Marketing Campaigns' folder in the Marketing space"
  4. "What lists are in the 'Resources' folder?"
  5. "Get details for a non-existent folder"
- **Expected Behavior:** Returns comprehensive folder data including name, associated lists, and space information.
- **Verification Method:** Verify that all expected folder fields are present in the response.

#### Tool Name: `update_folder`
- **Objective:** Modify properties of an existing folder.
- **Prompts:**
  1. "Rename folder 'Sprints' to 'Development Sprints'"
  2. "Update folder 123456789 to use custom statuses"
  3. "Change the name of the 'Resources' folder in the Marketing space"
  4. "Update both name and status configuration of 'Old Projects' folder"
  5. "Modify a non-existent folder"
- **Expected Behavior:** Updates the specified folder fields and returns the updated folder data.
- **Verification Method:** Use `get_folder` to verify the changes were applied correctly.

#### Tool Name: `delete_folder`
- **Objective:** Permanently remove a folder and all its contents.
- **Prompts:**
  1. "Delete folder 'Archived Projects'"
  2. "Remove folder 123456789 completely"
  3. "Permanently delete the 'Old Campaigns' folder in the Marketing space"
  4. "Delete all lists in the 'Completed' folder by removing the folder"
  5. "Remove a non-existent folder"
- **Expected Behavior:** Successfully deletes the folder if it exists and returns confirmation. For non-existent folders, returns appropriate error.
- **Verification Method:** Attempt to use `get_folder` to confirm the folder no longer exists.

### Tag

#### Tool Name: `get_space_tags`
- **Objective:** Retrieve all tags defined in a ClickUp space.
- **Prompts:**
  1. "Show all tags in the Development space"
  2. "Get tags from space 123456789"
  3. "What tags are available in the Marketing space?"
  4. "List all existing tags for the Design team space"
  5. "Get tags from a non-existent space"
- **Expected Behavior:** Returns an array of all tags defined in the specified space.
- **Verification Method:** Verify that the returned data structure contains tag names, colors, and IDs.

#### Tool Name: `create_space_tag`
- **Objective:** Create a new tag within a ClickUp space.
- **Prompts:**
  1. "Create a tag called 'urgent' with red color in the Development space"
  2. "Add a new tag 'qa-approved' to space 123456789"
  3. "Create tag 'needs-review' in the Marketing space with yellow color"
  4. "Set up a 'blocked' tag in the Design space"
  5. "Create a tag in a non-existent space"
- **Expected Behavior:** Successfully creates the tag in the specified space and returns the tag data.
- **Verification Method:** Use `get_space_tags` to verify the tag was created with correct properties.

#### Tool Name: `update_space_tag`
- **Objective:** Modify properties of an existing tag.
- **Prompts:**
  1. "Change the color of tag 'urgent' to orange in the Development space"
  2. "Rename tag 'bug' to 'critical-bug' in space 123456789"
  3. "Update tag 'needs-review' in the Marketing space to have green color"
  4. "Modify both name and color of the 'blocked' tag in Design space"
  5. "Update a non-existent tag"
- **Expected Behavior:** Updates the specified tag fields and returns the updated tag data.
- **Verification Method:** Use `get_space_tags` to verify the changes were applied correctly.

#### Tool Name: `delete_space_tag`
- **Objective:** Permanently remove a tag from a space.
- **Prompts:**
  1. "Delete tag 'obsolete' from the Development space"
  2. "Remove tag 'old-version' from space 123456789"
  3. "Permanently delete the 'draft' tag from the Marketing space"
  4. "Delete the unused 'legacy' tag from Design space"
  5. "Remove a non-existent tag"
- **Expected Behavior:** Successfully deletes the tag if it exists and returns confirmation. For non-existent tags, returns appropriate error.
- **Verification Method:** Use `get_space_tags` to confirm the tag no longer exists in the list of space tags.

#### Tool Name: `add_tag_to_task`
- **Objective:** Apply an existing tag to a specific task.
- **Prompts:**
  1. "Tag task 123456789 with 'urgent'"
  2. "Add the 'needs-review' tag to 'Homepage redesign' task"
  3. "Apply tag 'qa-approved' to task 123456789"
  4. "Add 'blocked' tag to the task 'API integration'"
  5. "Tag a task with a non-existent tag"
- **Expected Behavior:** Successfully adds the tag to the task and returns confirmation.
- **Verification Method:** Use `get_task` to verify the tag appears in the task's tags array.

#### Tool Name: `remove_tag_from_task`
- **Objective:** Remove a tag from a specific task.
- **Prompts:**
  1. "Remove 'urgent' tag from task 123456789"
  2. "Delete the 'needs-review' tag from 'Homepage redesign' task"
  3. "Take off tag 'qa-approved' from task 123456789"
  4. "Remove 'blocked' tag from the task 'API integration'"
  5. "Remove a tag that isn't applied to the task"
- **Expected Behavior:** Successfully removes the tag from the task and returns confirmation.
- **Verification Method:** Use `get_task` to verify the tag no longer appears in the task's tags array.

## 📊 Test Execution

For each test case:
1. Execute the prompt against the ClickUp MCP Server
2. Capture the response
3. Verify the result matches the expected behavior using the specified verification method
4. Document any discrepancies or unexpected behavior

## 🔄 Maintenance

This test plan should be updated when:
- New tools are added to the ClickUp MCP Server
- Existing tools are modified or have parameter changes
- New edge cases or usage patterns are identified 