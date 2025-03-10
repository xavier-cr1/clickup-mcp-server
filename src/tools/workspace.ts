/**
 * ClickUp MCP Workspace Tools
 * 
 * This module defines workspace-related tools like retrieving workspace hierarchy.
 * It handles the workspace tool definitions and the implementation of their handlers.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceTree, WorkspaceNode } from '../services/clickup/types.js';

// Use the workspace service imported from the server
// This is defined when server.ts imports this module
let workspaceService: any;

/**
 * Tool definition for retrieving the complete workspace hierarchy
 */
export const workspaceHierarchyTool: Tool = {
  name: 'get_workspace_hierarchy',
  description: 'Get the complete workspace hierarchy including spaces, folders, and lists.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Initialize the tool with services
 */
export function initializeWorkspaceTool(services: any) {
  workspaceService = services.workspace;
}

/**
 * Handler for the get_workspace_hierarchy tool
 */
export async function handleGetWorkspaceHierarchy() {
  try {
    // Get workspace hierarchy from the workspace service
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const response = formatHierarchyResponse(hierarchy);
    return response;
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error getting workspace hierarchy: ${error.message}`
        }
      ]
    };
  }
}

/**
 * Format the hierarchy for the response
 */
function formatHierarchyResponse(hierarchy: WorkspaceTree): any {
  try {
    // Helper function to format nodes by type
    const formatNodesByType = (nodes: WorkspaceNode[] = []) => {
      const result: any = {
        spaces: [],
        folders: [],
        lists: []
      };
      
      for (const node of nodes) {
        if (node.type === 'space') {
          const spaceResult = {
            id: node.id,
            name: node.name,
            type: node.type,
            lists: [],
            folders: []
          };
          
          // Process children of space
          if (node.children && node.children.length > 0) {
            const childrenByType = formatNodesByType(node.children);
            spaceResult.lists = childrenByType.lists;
            spaceResult.folders = childrenByType.folders;
          }
          
          result.spaces.push(spaceResult);
        } else if (node.type === 'folder') {
          const folderResult = {
            id: node.id,
            name: node.name,
            type: node.type,
            lists: []
          };
          
          // Process children of folder (only lists)
          if (node.children && node.children.length > 0) {
            folderResult.lists = node.children
              .filter(child => child.type === 'list')
              .map(list => ({
                id: list.id,
                name: list.name,
                type: list.type
              }));
          }
          
          result.folders.push(folderResult);
        } else if (node.type === 'list') {
          result.lists.push({
            id: node.id,
            name: node.name,
            type: node.type
          });
        }
      }
      
      return result;
    };
    
    // Convert the workspace hierarchy to a simplified format
    const rootChildren = formatNodesByType(hierarchy.root.children);
    
    const formattedHierarchy = {
      workspaceId: hierarchy.root.id,
      workspaceName: hierarchy.root.name,
      spaces: rootChildren.spaces
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedHierarchy, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error formatting workspace hierarchy: ${error.message}`
        }
      ]
    };
  }
} 