# v0.8.5 Release Notes

### 🚀 New Features & Improvements

- **Major Enhancement: Advanced Date Parsing System**:
  - **Smart Preprocessing Layer**: Automatically corrects typos and normalizes natural language expressions
    - Typo correction: `"tommorow"` → `"tomorrow"`, `"yesterady"` → `"yesterday"`
    - Natural language enhancement: `"tomorrow morning"` → `"tomorrow 9am"`, `"yesterday evening"` → `"yesterday 6pm"`
    - Complex expression normalization: `"day after tomorrow"` → `"+2 days"`, `"day before yesterday"` → `"-2 days"`
    - Time format normalization: Handles `"@"`, `"at"`, and various am/pm formats
  - **Enhanced Pattern Matching**: Consolidated regex patterns with improved flexibility
    - Relative days with time: `"+3 days 2pm"`, `"-2 days 9:30am"`
    - Relative weeks with time: `"+2 weeks 1pm"`, `"-1 weeks 5pm"`
    - Enhanced yesterday/tomorrow: `"tomorrow 8am"`, `"yesterday 7:30pm"`
  - **Expanded Format Support**: Added support for multiple new date formats
    - US dates with time: `"7/4/2025 5pm"`, `"11/11/2030 11:11pm"`
    - Text month formats: `"march 10 2025 6:30pm"`
    - Dates without year: `"10/10 6:00pm"` (assumes current year)
    - Timestamp boundary fix: Now accepts Year 2000 boundary (`946684800000`)
  - **Improved Date Clearing**: Fixed date clearing functionality to properly set `null` values
  - **Code Optimization**: Reduced code duplication by 40% with helper functions and consolidated patterns
  - **Performance**: Maintains sub-millisecond parsing speed (~0.188ms average)
  - **Comprehensive Testing**: Achieves 100% success rate on 50-test comprehensive suite
  - **Backward Compatibility**: All existing functionality preserved while adding significant new capabilities

### 🐛 Bug Fixes

- **Fixed Task Assignment Functionality**:
  - **Root Cause**: ClickUp API uses different formats for assignees in task creation vs updates
    - Creation: `"assignees": [user_id1, user_id2]` (simple array)
    - Updates: `"assignees": { "add": [user_id1], "rem": [user_id2] }` (object with add/rem arrays)
  - **Parameter Parsing**: Fixed MCP serialization issue where assignee arrays were received as strings
  - **Smart Assignment Logic**: Implemented intelligent add/remove calculation by comparing current vs desired assignees
  - **Complete Functionality**: Now supports adding, removing, and updating task assignees
  - **Multiple Formats**: Supports user IDs, emails, and usernames for assignee resolution
  - **TypeScript Types**: Updated interfaces to support both array and object assignee formats
  - **Testing**: Verified full assignment cycle (add → remove → re-add) works correctly

- **Fixed Track Time tool response formatting issue**:
  - Fixed issue where Track Time tools (start/stop time tracking, get time entries, etc.) were executing successfully but returning no output to users
  - **Root cause**: Time tracking handlers were returning raw JavaScript objects instead of using proper MCP server response formatting
  - **Solution**: Updated all 6 time tracking handlers to use `sponsorService.createResponse()` method for consistent response formatting
  - **Handlers fixed**: `handleStartTimeTracking`, `handleStopTimeTracking`, `handleGetTaskTimeEntries`, `handleAddTimeEntry`, `handleDeleteTimeEntry`, `handleGetCurrentTimeEntry`
  - **Enhanced error handling**: All error responses now use `sponsorService.createErrorResponse()` for consistent error formatting
  - **Added null safety**: Fixed potential undefined property access in time entries data with proper null checks
  - **Improved user experience**: Added helpful success messages and proper data structure formatting
  - **Impact**: Track Time tools now provide clear, formatted JSON responses instead of appearing to run silently
