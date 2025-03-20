/**
 * Common type definitions for ClickUp API entities
 */

/**
 * Task priority level (1-4 or null)
 * 1 = Urgent (Highest)
 * 2 = High
 * 3 = Normal
 * 4 = Low (Lowest)
 * null = No priority
 */
export type TaskPriority = 1 | 2 | 3 | 4 | null;

// Helper function to validate and convert priority values
export function toTaskPriority(value: unknown): TaskPriority | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value === "null") return null;
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
  
  // Validate it's a valid priority number
  if (typeof numValue === 'number' && !isNaN(numValue) && [1, 2, 3, 4].includes(numValue)) {
    return numValue as TaskPriority;
  }
  
  return undefined;
}

/**
 * Priority object as returned by the ClickUp API
 */
export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

/**
 * Status object as returned by the ClickUp API
 */
export interface ClickUpStatus {
  id: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

/**
 * User object as returned by the ClickUp API
 */
export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
  initials?: string;
}

/**
 * Space object as returned by the ClickUp API
 */
export interface ClickUpSpace {
  id: string;
  name: string;
  private: boolean;
  statuses: ClickUpStatus[];
  multiple_assignees: boolean;
  features?: {
    due_dates: {
      enabled: boolean;
      start_date: boolean;
      remap_due_dates: boolean;
      remap_closed_due_date: boolean;
    };
    time_tracking: {
      enabled: boolean;
    };
    tags: {
      enabled: boolean;
    };
    time_estimates: {
      enabled: boolean;
    };
    checklists: {
      enabled: boolean;
    };
    custom_fields: {
      enabled: boolean;
    };
    remap_dependencies: {
      enabled: boolean;
    };
    dependency_warning: {
      enabled: boolean;
    };
    portfolios: {
      enabled: boolean;
    };
  };
  archived: boolean;
}

/**
 * Folder object as returned by the ClickUp API
 */
export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex: number;
  override_statuses: boolean;
  hidden: boolean;
  space: {
    id: string;
    name: string;
  };
  task_count: string;
  lists: ClickUpList[];
  archived: boolean;
}

/**
 * List object as returned by the ClickUp API
 */
export interface ClickUpList {
  id: string;
  name: string;
  orderindex: number;
  content: string;
  status: {
    status: string;
    color: string;
    hide_label: boolean;
  };
  priority: {
    priority: string;
    color: string;
  };
  assignee: ClickUpUser | null;
  task_count: number;
  due_date: string | null;
  start_date: string | null;
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  } | null;
  space: {
    id: string;
    name: string;
  };
  archived: boolean;
  override_statuses: boolean;
  statuses?: ClickUpStatus[];
}

/**
 * Task object as returned by the ClickUp API
 */
export interface ClickUpTask {
  id: string;
  name: string;
  custom_id?: string;
  text_content: string;
  description: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed: string | null;
  creator: {
    id: number;
    username: string;
    color: string;
    profilePicture: string | null;
  };
  assignees: ClickUpUser[];
  checklists: any[];
  tags: {
    name: string;
    tag_fg: string;
    tag_bg: string;
    creator?: number;
  }[];
  parent: string | null;
  priority: ClickUpPriority | null;
  due_date: string | null;
  start_date: string | null;
  time_estimate: number | null;
  time_spent: number | null;
  list: {
    id: string;
    name: string;
    access: boolean;
  };
  folder: {
    id: string;
    name: string;
    hidden: boolean;
    access: boolean;
  } | null;
  space: {
    id: string;
    name: string;
  };
  url: string;
}

/**
 * Data for creating a task
 */
export interface CreateTaskData {
  name: string;
  description?: string;
  markdown_description?: string;
  assignees?: (number | string)[];
  tags?: string[];
  status?: string;
  priority?: TaskPriority;
  due_date?: number;
  due_date_time?: boolean;
  time_estimate?: number;
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string | null;
  links_to?: string | null;
  check_required_custom_fields?: boolean;
  custom_fields?: Array<{
    id: string;
    value: any;
  }>;
}

/**
 * Data for creating a list
 */
export interface CreateListData {
  name: string;
  content?: string;
  due_date?: number;
  due_date_time?: boolean;
  priority?: TaskPriority;
  assignee?: number;
  status?: string;
}

/**
 * Data for creating a folder
 */
export interface CreateFolderData {
  name: string;
  override_statuses?: boolean;
}

/**
 * Update task data (partial)
 */
export interface UpdateTaskData extends Partial<CreateTaskData> {}

/**
 * Task filters for getTasks method
 */
export interface TaskFilters {
  include_closed?: boolean;
  subtasks?: boolean;
  page?: number;
  order_by?: 'id' | 'created' | 'updated' | 'due_date';
  reverse?: boolean;
  statuses?: string[];
  include_subtasks?: boolean;
  assignees?: string[];
  due_date_gt?: number;
  due_date_lt?: number;
  date_created_gt?: number;
  date_created_lt?: number;
  date_updated_gt?: number;
  date_updated_lt?: number;
  custom_fields?: Record<string, any>;
}

/**
 * Response when retrieving tasks from a list
 */
export interface TasksResponse {
  tasks: ClickUpTask[];
  statuses: string[];
}

/**
 * Node in the workspace hierarchy tree
 */
export interface WorkspaceNode {
  id: string;
  name: string;
  type: 'space' | 'folder' | 'list';
  parentId?: string;
  children?: WorkspaceNode[];
}

/**
 * Complete workspace hierarchy tree
 */
export interface WorkspaceTree {
  root: {
    id: string;
    name: string;
    children: WorkspaceNode[];
  };
}

/**
 * Data for creating multiple tasks at once
 */
export interface BulkCreateTasksData {
  tasks: CreateTaskData[];
}

/**
 * Comment object as returned by the ClickUp API
 */
export interface ClickUpComment {
  id: string;
  comment: string; // The comment text
  comment_text: string; // The comment text without formatting
  user: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  resolved: boolean;
  assigned_by?: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  assigned?: {
    id: number;
    username: string;
    email: string;
    color: string;
    profilePicture?: string;
  };
  date: string; // ISO date string
  reactions?: {
    [key: string]: {
      count: number;
      users: Array<{
        id: number;
        username: string;
        email: string;
        color: string;
        profilePicture: string | null;
      }>;
    };
  };
  attachments?: ClickUpCommentAttachment[];
}

/**
 * Comment attachment object as returned by the ClickUp API
 */
export interface ClickUpCommentAttachment {
  id: string;
  date: string;
  title: string;
  type: string;
  source: string;
  thumbnail_small?: string;
  thumbnail_medium?: string;
  thumbnail_large?: string;
  url: string;
  url_viewer?: string;
}

/**
 * Comments response object returned by the ClickUp API
 */
export interface CommentsResponse {
  comments: ClickUpComment[];
} 