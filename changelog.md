# Changelog

## Unreleased

### Improvements
- Added support for "X minutes from now" expressions in date parsing:
  - Updated `getRelativeTimestamp` function to accept minutes parameter
  - Added regex pattern to match "X minutes from now" in natural language parsing
  - Extended relative time parsing to handle minute-level precision

## v0.4.69 (2025-03-17)

### Improvements
- Enhanced task name matching with improved flexibility:
  - Added support for case-insensitive matching
  - Added support for partial name matching
  - Added support for matching without emojis
- Fixed error response formatting in task comment retrieval
- Applied improved name matching to all task-related tools:
  - get_task_comments
  - get_task
  - update_task
  - move_task
  - duplicate_task
  - delete_bulk_tasks
- Fixed workspace hierarchy to correctly show lists directly in spaces 
