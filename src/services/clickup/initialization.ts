import { WorkspaceService } from "./workspace.js";
import { ClickUpServiceConfig } from "./index.js";

/**
 * Service responsible for initializing the server state
 * Handles preloading workspace data
 */
export class InitializationService {
  private workspaceService: WorkspaceService;

  constructor(config: ClickUpServiceConfig) {
    // Create workspace service
    this.workspaceService = new WorkspaceService(config.apiKey, config.teamId, config.baseUrl);
  }

  /**
   * Preload workspace hierarchy data on server startup
   * This loads the entire workspace tree for faster initial access
   */
  async preloadWorkspaceData(): Promise<void> {
    try {
      console.log("Preloading workspace data...");
      const startTime = Date.now();

      // Force refresh to get the latest data
      await this.workspaceService.getWorkspaceHierarchy(true);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`Workspace data preloaded successfully in ${duration.toFixed(2)}s`);
    } catch (error) {
      console.error("Failed to preload workspace data:", error);
    }
  }
} 