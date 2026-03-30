/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EditableContent } from '../../types/portfolio';

const STORAGE_KEY = 'portfolio_draft_data';

export const saveDraft = (data: EditableContent) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadDraft = (): EditableContent | null => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse draft data', e);
    }
  }
  return null;
};

export const clearDraft = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const exportToJson = (data: EditableContent, filename: string = 'portfolio-data.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
