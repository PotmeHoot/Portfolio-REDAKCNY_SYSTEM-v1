/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { EditableContent, Project } from '../../types/portfolio';

export interface ZipImportResult {
  success: boolean;
  data?: EditableContent;
  error?: string;
}

export const importPortfolioZip = async (file: File): Promise<ZipImportResult> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Look for config.json and projects.json or a combined editable-content.json
    const configFile = zip.file('config.json');
    const projectsFile = zip.file('projects.json');
    const combinedFile = zip.file('editable-content.json');

    let config: any = {};
    let projects: Project[] = [];

    if (combinedFile) {
      const content = await combinedFile.async('string');
      const data = JSON.parse(content);
      return { success: true, data };
    }

    if (configFile) {
      const content = await configFile.async('string');
      config = JSON.parse(content);
    }

    if (projectsFile) {
      const content = await projectsFile.async('string');
      projects = JSON.parse(content);
    }

    if (!configFile && !projectsFile) {
      return { success: false, error: 'No compatible JSON files found in ZIP.' };
    }

    return {
      success: true,
      data: {
        config: config.config || config, // Handle different structures
        projects: projects
      }
    };
  } catch (error) {
    console.error('ZIP Import Error:', error);
    return { success: false, error: 'Failed to process ZIP file.' };
  }
};
