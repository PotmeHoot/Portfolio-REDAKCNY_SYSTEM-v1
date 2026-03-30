/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { EditableContent, Project, MediaItem } from '../../types/portfolio';

export interface ZipImportResult {
  success: boolean;
  data?: EditableContent;
  error?: string;
}

/**
 * Finds a file in the ZIP archive that ends with the given suffix.
 * Returns the file with the shortest path if multiple matches exist.
 */
const findFileBySuffix = (zip: JSZip, suffix: string) => {
  const files = Object.keys(zip.files);
  const matches = files.filter(f => f.endsWith(suffix));
  if (matches.length === 0) return null;
  
  // Sort by length to pick the most "root-like" match
  matches.sort((a, b) => a.length - b.length);
  return zip.file(matches[0]);
};

/**
 * Maps legacy project data to the internal Project structure.
 */
const mapLegacyProject = (legacy: any): Project => {
  const id = legacy.id || `project-${Math.random().toString(36).substring(2, 11)}`;
  
  // Map assets to gallery
  const gallery: MediaItem[] = (legacy.assets || []).map((asset: any, idx: number) => ({
    id: asset.id || `m-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    type: asset.type === 'video' ? 'video' : 'image',
    url: asset.file || asset.url || '',
    caption: asset.caption || '',
    poster: asset.poster || ''
  }));

  return {
    id,
    slug: legacy.slug || '',
    title: legacy.title || 'Untitled Project',
    subtitle: legacy.subtitle || '',
    client: legacy.client || '',
    year: legacy.year || '',
    category: legacy.category || 'Uncategorized',
    tags: legacy.tags || [],
    shortDescription: legacy.shortDescription || '',
    longDescription: legacy.longDescription || '',
    credits: legacy.credits || '',
    ctaLabel: legacy.ctaLabel || '',
    poster: legacy.poster || '',
    cover: legacy.cover || '',
    gallery,
    additionalAssets: legacy.additionalAssets || [],
    featured: !!legacy.featured,
    visible: legacy.visible !== undefined ? !!legacy.visible : true,
    sortOrder: typeof legacy.sortOrder === 'number' ? legacy.sortOrder : 0,
    accentColor: legacy.accentColor || ''
  };
};

/**
 * Validates the imported content structure.
 */
const validateContent = (data: any): string | null => {
  if (!data.config) return 'Missing configuration data (config.json).';
  if (!data.projects || !Array.isArray(data.projects)) return 'Missing or invalid projects data (projects.json).';
  return null;
};

export const importPortfolioZip = async (file: File): Promise<ZipImportResult> => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Try to find editable-content.json first (modern format)
    const combinedFile = findFileBySuffix(zip, 'public/data/editable-content.json') || findFileBySuffix(zip, 'editable-content.json');
    
    if (combinedFile) {
      try {
        const content = await combinedFile.async('string');
        const data = JSON.parse(content);
        
        // Simple check if it's already in the new format
        if (data.projects && Array.isArray(data.projects) && data.config) {
          return { success: true, data };
        }
        // If not, we fall through to legacy parsing
      } catch (e) {
        console.warn('Failed to parse editable-content.json, falling back to legacy files.');
      }
    }

    // 2. Look for legacy config.json and projects.json
    const configFile = findFileBySuffix(zip, 'public/data/config.json') || findFileBySuffix(zip, 'config.json');
    const projectsFile = findFileBySuffix(zip, 'public/data/projects.json') || findFileBySuffix(zip, 'projects.json');

    if (!configFile && !projectsFile) {
      return { success: false, error: 'Could not find config.json or projects.json in the ZIP archive.' };
    }

    let config: any = {};
    let rawProjects: any[] = [];

    if (configFile) {
      const content = await configFile.async('string');
      const parsedConfig = JSON.parse(content);
      config = parsedConfig.config || parsedConfig;
    }

    if (projectsFile) {
      const content = await projectsFile.async('string');
      const projectsData = JSON.parse(content);
      
      // Handle projects.json structure: { projects: [...], arItems: [...] }
      if (projectsData && Array.isArray(projectsData.projects)) {
        rawProjects = projectsData.projects;
      } else if (Array.isArray(projectsData)) {
        rawProjects = projectsData;
      }
    }

    // Map legacy projects to internal format
    const projects = rawProjects.map(mapLegacyProject);

    const data: EditableContent = {
      config: {
        name: config.name || 'Portfolio User',
        description: config.description || '',
        email: config.email || '',
        socials: config.socials || []
      },
      projects
    };

    const validationError = validateContent(data);
    if (validationError) {
      return { success: false, error: validationError };
    }

    return { success: true, data };
  } catch (error) {
    console.error('ZIP Import Error:', error);
    return { success: false, error: `Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};
