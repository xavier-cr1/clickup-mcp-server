/**
 * ClickUp Workspace Service Module
 * 
 * Handles workspace hierarchy and space-related operations
 */

import { BaseClickUpService, ClickUpServiceError, ErrorCode } from './base.js';
import { 
  ClickUpSpace, 
  ClickUpFolder,
  ClickUpList,
  WorkspaceTree, 
  WorkspaceNode
} from './types.js';

/**
 * Service for workspace-related operations
 */
export class WorkspaceService extends BaseClickUpService {
  
  // Store the workspace hierarchy in memory
  private workspaceHierarchy: WorkspaceTree | null = null;

  /**
   * Creates an instance of WorkspaceService
   * @param apiKey - ClickUp API key
   * @param teamId - ClickUp team ID
   * @param baseUrl - Optional custom API URL
   */
  constructor(
    apiKey: string, 
    teamId: string, 
    baseUrl?: string
  ) {
    super(apiKey, teamId, baseUrl);
  }

  /**
   * Helper method to handle errors consistently
   * @param error - Error caught from a try/catch
   * @param message - Optional message to add to the error
   * @returns - A standardized ClickUpServiceError
   */
  private handleError(error: any, message?: string): ClickUpServiceError {
    // Log the error for debugging
    console.error('WorkspaceService error:', error);
    
    // If the error is already a ClickUpServiceError, return it
    if (error instanceof ClickUpServiceError) {
      return error;
    }

    // Otherwise, create a new ClickUpServiceError
    const errorMessage = message || 'An error occurred in WorkspaceService';
    return new ClickUpServiceError(errorMessage, ErrorCode.WORKSPACE_ERROR, error);
  }

  /**
   * Get all spaces for the team
   * @returns - Promise resolving to array of spaces
   */
  async getSpaces(): Promise<ClickUpSpace[]> {
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.client.get(`/team/${this.teamId}/space`);
        return result.data;
      });
      return response.spaces || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to get spaces');
    }
  }

  /**
   * Get a specific space by ID
   * @param spaceId - The ID of the space to retrieve
   * @returns - Promise resolving to the space object
   */
  async getSpace(spaceId: string): Promise<ClickUpSpace> {
    try {
      // Validate spaceId
      if (!spaceId) {
        throw new ClickUpServiceError(
          'Space ID is required', 
          ErrorCode.INVALID_PARAMETER
        );
      }

      return await this.makeRequest(async () => {
        const result = await this.client.get(`/space/${spaceId}`);
        return result.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get space with ID ${spaceId}`);
    }
  }

  /**
   * Find a space by name
   * @param spaceName - The name of the space to find
   * @returns - Promise resolving to the space or null if not found
   */
  async findSpaceByName(spaceName: string): Promise<ClickUpSpace | null> {
    try {
      // Validate spaceName
      if (!spaceName) {
        throw new ClickUpServiceError(
          'Space name is required', 
          ErrorCode.INVALID_PARAMETER
        );
      }

      // Get all spaces and find the one with the matching name
      const spaces = await this.getSpaces();
      const space = spaces.find(s => s.name === spaceName);
      
      return space || null;
    } catch (error) {
      throw this.handleError(error, `Failed to find space with name ${spaceName}`);
    }
  }

  /**
   * Get the complete workspace hierarchy including spaces, folders, and lists
   * @param forceRefresh - Whether to force a refresh of the hierarchy
   * @returns - Promise resolving to the workspace tree
   */
  async getWorkspaceHierarchy(forceRefresh = false): Promise<WorkspaceTree> {
    try {
      // If we have the hierarchy in memory and not forcing refresh, return it
      if (this.workspaceHierarchy && !forceRefresh) {
        return this.workspaceHierarchy;
      }

      // Start building the workspace tree
      const workspaceTree: WorkspaceTree = {
        root: {
          id: this.teamId,
          name: 'Workspace',
          children: []
        }
      };

      // Get all spaces
      const spaces = await this.getSpaces();

      // Process each space
      for (const space of spaces) {
        const spaceNode: WorkspaceNode = {
          id: space.id,
          name: space.name,
          type: 'space',
          children: []
        };

        // Get folders for the space
        const folders = await this.getFoldersInSpace(space.id);
        for (const folder of folders) {
          const folderNode: WorkspaceNode = {
            id: folder.id,
            name: folder.name,
            type: 'folder',
            parentId: space.id,
            children: []
          };

          // Get lists in the folder
          const listsInFolder = await this.getListsInFolder(folder.id);
          for (const list of listsInFolder) {
            folderNode.children?.push({
              id: list.id,
              name: list.name,
              type: 'list',
              parentId: folder.id
            });
          }

          spaceNode.children?.push(folderNode);
        }

        // Get lists directly in the space (not in any folder)
        const listsInSpace = await this.getListsInSpace(space.id);
        for (const list of listsInSpace) {
          spaceNode.children?.push({
            id: list.id,
            name: list.name,
            type: 'list',
            parentId: space.id
          });
        }

        workspaceTree.root.children.push(spaceNode);
      }

      // Store the hierarchy for later use
      this.workspaceHierarchy = workspaceTree;
      return workspaceTree;
    } catch (error) {
      throw this.handleError(error, 'Failed to get workspace hierarchy');
    }
  }

  /**
   * Clear the stored workspace hierarchy, forcing a fresh fetch on next request
   */
  clearWorkspaceHierarchy(): void {
    this.workspaceHierarchy = null;
  }

  /**
   * Find a node in the workspace tree by name and type
   * @param node - The node to start searching from
   * @param name - The name to search for
   * @param type - The type of node to search for
   * @returns - The node and its path if found, null otherwise
   */
  private findNodeInTree(
    node: WorkspaceNode | WorkspaceTree['root'],
    name: string,
    type: 'space' | 'folder' | 'list'
  ): { node: WorkspaceNode; path: string } | null {
    // If this is the node we're looking for, return it
    if ('type' in node && node.type === type && node.name === name) {
      return { node, path: node.name };
    }

    // Otherwise, search its children recursively
    for (const child of (node.children || [])) {
      const result = this.findNodeInTree(child, name, type);
      if (result) {
        // Prepend this node's name to the path
        const currentNodeName = 'name' in node ? node.name : 'Workspace';
        result.path = `${currentNodeName} > ${result.path}`;
        return result;
      }
    }

    // Not found in this subtree
    return null;
  }

  /**
   * Find an ID by name and type in the workspace hierarchy
   * @param hierarchy - The workspace hierarchy
   * @param name - The name to search for
   * @param type - The type of node to search for
   * @returns - The ID and path if found, null otherwise
   */
  findIDByNameInHierarchy(
    hierarchy: WorkspaceTree,
    name: string,
    type: 'space' | 'folder' | 'list'
  ): { id: string; path: string } | null {
    const result = this.findNodeInTree(hierarchy.root, name, type);
    if (result) {
      return { id: result.node.id, path: result.path };
    }
    return null;
  }

  /**
   * Find a space ID by name
   * @param spaceName - The name of the space to find
   * @returns - Promise resolving to the space ID or null if not found
   */
  async findSpaceIDByName(spaceName: string): Promise<string | null> {
    const space = await this.findSpaceByName(spaceName);
    return space ? space.id : null;
  }

  /**
   * Get lists from the API (using the appropriate endpoint based on context)
   * @param spaceId - The ID of the space
   * @returns - Promise resolving to array of lists
   */
  private async getLists(spaceId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.client.get(`/space/${spaceId}/list`);
        return result.data;
      });
      return response.lists || [];
    } catch (error) {
      throw this.handleError(error, `Failed to get lists for space ${spaceId}`);
    }
  }

  /**
   * Get folders from the API
   * @param spaceId - The ID of the space
   * @returns - Promise resolving to array of folders
   */
  private async getFolders(spaceId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.client.get(`/space/${spaceId}/folder`);
        return result.data;
      });
      return response.folders || [];
    } catch (error) {
      throw this.handleError(error, `Failed to get folders for space ${spaceId}`);
    }
  }

  /**
   * Get a specific folder by ID
   * @param folderId - The ID of the folder to retrieve
   * @returns - Promise resolving to the folder
   */
  async getFolder(folderId: string): Promise<any> {
    try {
      return await this.makeRequest(async () => {
        const result = await this.client.get(`/folder/${folderId}`);
        return result.data;
      });
    } catch (error) {
      throw this.handleError(error, `Failed to get folder with ID ${folderId}`);
    }
  }

  /**
   * Get lists in a space (not in any folder)
   * @param spaceId - The ID of the space
   * @returns - Promise resolving to array of lists
   */
  async getListsInSpace(spaceId: string): Promise<ClickUpList[]> {
    try {
      const lists = await this.getLists(spaceId);
      return lists.filter((list) => !list.folder); // Filter lists not in a folder
    } catch (error) {
      throw this.handleError(error, `Failed to get lists in space ${spaceId}`);
    }
  }

  /**
   * Get folders in a space
   * @param spaceId - The ID of the space
   * @returns - Promise resolving to array of folders
   */
  async getFoldersInSpace(spaceId: string): Promise<ClickUpFolder[]> {
    try {
      return await this.getFolders(spaceId);
    } catch (error) {
      throw this.handleError(error, `Failed to get folders in space ${spaceId}`);
    }
  }

  /**
   * Get lists in a folder
   * @param folderId - The ID of the folder
   * @returns - Promise resolving to array of lists
   */
  async getListsInFolder(folderId: string): Promise<ClickUpList[]> {
    try {
      const response = await this.makeRequest(async () => {
        const result = await this.client.get(`/folder/${folderId}/list`);
        return result.data;
      });
      return response.lists || [];
    } catch (error) {
      throw this.handleError(error, `Failed to get lists in folder ${folderId}`);
    }
  }
} 