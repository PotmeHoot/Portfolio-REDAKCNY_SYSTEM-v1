/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  poster?: string; // For videos
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  client?: string;
  year?: string;
  category: string;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  credits?: string;
  ctaLabel?: string;
  poster: string;
  cover?: string;
  gallery: MediaItem[];
  additionalAssets?: MediaItem[];
  featured: boolean;
  visible: boolean;
  sortOrder: number;
  accentColor?: string;
}

export interface EditableContent {
  projects: Project[];
  config: {
    name: string;
    description: string;
    email: string;
    socials: {
      platform: string;
      url: string;
    }[];
  };
}
