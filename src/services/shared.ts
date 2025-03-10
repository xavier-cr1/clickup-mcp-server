/**
 * Shared Services Module
 * 
 * This module maintains singleton instances of services that should be shared
 * across the application to ensure consistent state.
 */

import { createClickUpServices, ClickUpServices } from './clickup/index.js';
import config from '../config.js';

// Create a single instance of ClickUp services to be shared
export const clickUpServices = createClickUpServices({
  apiKey: config.clickupApiKey,
  teamId: config.clickupTeamId
});

// Export individual services for convenience
export const {
  list: listService,
  task: taskService,
  folder: folderService,
  workspace: workspaceService
} = clickUpServices; 