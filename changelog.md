# Changelog

## v0.4.69 (2023-08-03)

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