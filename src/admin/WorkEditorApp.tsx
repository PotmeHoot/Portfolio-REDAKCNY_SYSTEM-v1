/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Star, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  LayoutGrid, 
  List,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Check,
  AlertCircle,
  Menu,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, EditableContent, MediaItem } from '../types/portfolio';
import { saveDraft, loadDraft, exportToJson, clearDraft } from './utils/contentImportExport';
import { importPortfolioZip } from './import/portfolioZipImport';
import { cn } from '../lib/utils';

// --- Sub-components ---

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onClick: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  isActive, 
  onClick, 
  onDelete, 
  onDuplicate 
}) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
        isActive 
          ? "bg-white shadow-sm border border-neutral-200" 
          : "hover:bg-neutral-100 border border-transparent"
      )}
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
        <img 
          src={project.poster} 
          alt={project.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        {!project.visible && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <EyeOff size={14} className="text-white" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-black" : "text-neutral-600"
          )}>
            {project.title || "Untitled Project"}
          </h3>
          {project.featured && <Star size={12} className="fill-amber-400 text-amber-400" />}
        </div>
        <p className="text-xs text-neutral-400 truncate">{project.category}</p>
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onDuplicate(project.id); }}
          className="p-1.5 hover:bg-neutral-200 rounded-md text-neutral-500"
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          className="p-1.5 hover:bg-red-100 rounded-md text-red-500"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

interface MediaAssetRowProps {
  item: MediaItem;
  onUpdate: (updates: Partial<MediaItem>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const MediaAssetRow: React.FC<MediaAssetRowProps> = ({ 
  item, 
  onUpdate, 
  onDelete, 
  onMoveUp, 
  onMoveDown 
}) => {
  return (
    <div className="flex gap-4 p-4 bg-white border border-neutral-200 rounded-xl group hover:border-neutral-300 transition-all">
      <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-100">
        {item.url ? (
          <img src={item.url} alt="Media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            {item.type === 'video' ? <VideoIcon size={24} /> : <ImageIcon size={24} />}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3">
          <select 
            value={item.type}
            onChange={(e) => onUpdate({ type: e.target.value as 'image' | 'video' })}
            className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <input 
            type="text" 
            value={item.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            className="flex-1 p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono"
            placeholder="Media URL..."
          />
        </div>
        <input 
          type="text" 
          value={item.caption || ""}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs"
          placeholder="Caption (optional)"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button 
          onClick={onDelete}
          className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
        <div className="flex flex-col border-t border-neutral-100 pt-1 mt-1">
          <button 
            disabled={!onMoveUp}
            onClick={onMoveUp}
            className={cn(
              "p-1 rounded transition-colors",
              onMoveUp ? "text-neutral-400 hover:bg-neutral-100 hover:text-black" : "text-neutral-200 cursor-not-allowed"
            )}
            title="Move Up"
          >
            <ChevronUp size={16} />
          </button>
          <button 
            disabled={!onMoveDown}
            onClick={onMoveDown}
            className={cn(
              "p-1 rounded transition-colors",
              onMoveDown ? "text-neutral-400 hover:bg-neutral-100 hover:text-black" : "text-neutral-200 cursor-not-allowed"
            )}
            title="Move Down"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function WorkEditorApp() {
  const [data, setData] = useState<EditableContent | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load initial data
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setData(draft);
      if (draft.projects.length > 0) setActiveProjectId(draft.projects[0].id);
    } else {
      fetch('/data/editable-content.json')
        .then(res => res.json())
        .then(initialData => {
          setData(initialData);
          if (initialData.projects.length > 0) setActiveProjectId(initialData.projects[0].id);
        })
        .catch(err => {
          console.error('Failed to load initial data', err);
          setMessage({ text: 'Failed to load data. Please try again.', type: 'error' });
        });
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (data) {
      saveDraft(data);
    }
  }, [data]);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const activeProject = data?.projects.find(p => p.id === activeProjectId);

  const updateProject = (id: string, updates: Partial<Project>) => {
    if (!data) return;
    setData({
      ...data,
      projects: data.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    });
    setHasUnsavedChanges(true);
  };

  const addProject = () => {
    if (!data) return;
    const newId = `project-${Date.now()}`;
    const newProject: Project = {
      id: newId,
      slug: `new-project-${data.projects.length + 1}`,
      title: "New Project",
      category: "Category",
      tags: [],
      shortDescription: "",
      longDescription: "",
      poster: "https://picsum.photos/seed/new/1920/1080",
      gallery: [],
      additionalAssets: [],
      featured: false,
      visible: true,
      sortOrder: data.projects.length
    };
    setData({
      ...data,
      projects: [...data.projects, newProject]
    });
    setActiveProjectId(newId);
    setHasUnsavedChanges(true);
    showMessage('New project added', 'success');
  };

  const duplicateProject = (id: string) => {
    if (!data) return;
    const original = data.projects.find(p => p.id === id);
    if (!original) return;
    
    const newId = `project-${Date.now()}`;
    const duplicate: Project = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      slug: `${original.slug}-copy`,
      sortOrder: data.projects.length
    };
    
    setData({
      ...data,
      projects: [...data.projects, duplicate]
    });
    setActiveProjectId(newId);
    setHasUnsavedChanges(true);
    showMessage('Project duplicated', 'success');
  };

  const deleteProject = (id: string) => {
    if (!data) return;
    if (window.confirm('Are you sure you want to delete this project?')) {
      const newData = {
        ...data,
        projects: data.projects.filter(p => p.id !== id)
      };
      setData(newData);
      if (activeProjectId === id) {
        setActiveProjectId(newData.projects[0]?.id || null);
      }
      setHasUnsavedChanges(true);
      showMessage('Project deleted', 'info');
    }
  };

  const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importPortfolioZip(file);
    if (result.success && result.data) {
      setData(result.data);
      if (result.data.projects.length > 0) setActiveProjectId(result.data.projects[0].id);
      showMessage('ZIP imported successfully', 'success');
    } else {
      showMessage(result.error || 'Import failed', 'error');
    }
    e.target.value = ''; // Reset input
  };

  const handleExport = () => {
    if (!data) return;
    exportToJson(data, `portfolio-export-${new Date().toISOString().split('T')[0]}.json`);
    setHasUnsavedChanges(false);
    showMessage('Data exported successfully', 'success');
  };

  const handleReset = () => {
    if (window.confirm('Discard all draft changes and reload from server?')) {
      clearDraft();
      window.location.reload();
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
          <div className="h-4 w-32 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="relative flex flex-col bg-white border-r border-neutral-200 z-20"
      >
        <div className="p-6 border-bottom border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <LayoutGrid size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Work Editor</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 hover:bg-neutral-100 rounded-md text-neutral-400 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Projects</span>
            <button 
              onClick={addProject}
              className="p-1 hover:bg-neutral-100 rounded-md text-neutral-600"
              title="Add Project"
            >
              <Plus size={16} />
            </button>
          </div>
          
          {data.projects.sort((a, b) => a.sortOrder - b.sortOrder).map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              isActive={activeProjectId === project.id}
              onClick={() => setActiveProjectId(project.id)}
              onDelete={deleteProject}
              onDuplicate={duplicateProject}
            />
          ))}
        </div>

        <div className="p-4 border-t border-neutral-100 space-y-2">
          <label className="flex items-center justify-center gap-2 w-full p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-medium transition-colors cursor-pointer">
            <Upload size={16} />
            Import ZIP
            <input type="file" accept=".zip" onChange={handleZipImport} className="hidden" />
          </label>
          <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-2 w-full p-2.5 bg-black text-white hover:bg-neutral-800 rounded-xl text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span>Work</span>
              <ChevronRight size={14} />
              <span className="text-neutral-900 font-medium">{activeProject?.title || "No project selected"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full flex items-center gap-1">
                <AlertCircle size={12} />
                Unsaved Changes
              </span>
            )}
            <button 
              onClick={handleReset}
              className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
              title="Reset Draft"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {activeProject ? (
              <div className="space-y-12 pb-24">
                {/* Section: Basic Info */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                    <Settings size={18} className="text-neutral-400" />
                    <h2 className="text-lg font-bold">Basic Information</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Project Title</label>
                      <input 
                        type="text" 
                        value={activeProject.title}
                        onChange={(e) => updateProject(activeProject.id, { title: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="e.g. Vibrant Landscapes"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Slug / URL ID</label>
                      <input 
                        type="text" 
                        value={activeProject.slug}
                        onChange={(e) => updateProject(activeProject.id, { slug: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="e.g. vibrant-landscapes"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Subtitle</label>
                      <input 
                        type="text" 
                        value={activeProject.subtitle || ""}
                        onChange={(e) => updateProject(activeProject.id, { subtitle: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="e.g. A collection of nature photography"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Category</label>
                      <input 
                        type="text" 
                        value={activeProject.category}
                        onChange={(e) => updateProject(activeProject.id, { category: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="e.g. Photography"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Client</label>
                      <input 
                        type="text" 
                        value={activeProject.client || ""}
                        onChange={(e) => updateProject(activeProject.id, { client: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Year</label>
                      <input 
                        type="text" 
                        value={activeProject.year || ""}
                        onChange={(e) => updateProject(activeProject.id, { year: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                      />
                    </div>
                  </div>
                </section>

                {/* Section: Content */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                    <List size={18} className="text-neutral-400" />
                    <h2 className="text-lg font-bold">Content</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Short Description</label>
                      <textarea 
                        value={activeProject.shortDescription}
                        onChange={(e) => updateProject(activeProject.id, { shortDescription: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all min-h-[80px]"
                        placeholder="Brief summary for list views..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Long Description</label>
                      <textarea 
                        value={activeProject.longDescription}
                        onChange={(e) => updateProject(activeProject.id, { longDescription: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all min-h-[160px]"
                        placeholder="Detailed project story..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-neutral-400">Credits</label>
                      <input 
                        type="text" 
                        value={activeProject.credits || ""}
                        onChange={(e) => updateProject(activeProject.id, { credits: e.target.value })}
                        className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="e.g. Photographer: John Doe"
                      />
                    </div>
                  </div>
                </section>

                {/* Section: Media */}
                <section className="space-y-12">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                    <ImageIcon size={18} className="text-neutral-400" />
                    <h2 className="text-lg font-bold">Media Management</h2>
                  </div>

                  {/* Main Media */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Main Media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-500">Poster Image (Thumbnail)</label>
                          {activeProject.poster && (
                            <button 
                              onClick={() => updateProject(activeProject.id, { poster: "" })}
                              className="text-[10px] uppercase font-bold text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="aspect-video rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                            {activeProject.poster ? (
                              <img src={activeProject.poster} alt="Poster" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <ImageIcon size={48} />
                              </div>
                            )}
                          </div>
                          <input 
                            type="text" 
                            value={activeProject.poster}
                            onChange={(e) => updateProject(activeProject.id, { poster: e.target.value })}
                            className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-xs font-mono"
                            placeholder="Poster Image URL..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-500">Cover Image (Header)</label>
                          {activeProject.cover && (
                            <button 
                              onClick={() => updateProject(activeProject.id, { cover: "" })}
                              className="text-[10px] uppercase font-bold text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="aspect-video rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
                            {activeProject.cover ? (
                              <img src={activeProject.cover} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <ImageIcon size={48} />
                              </div>
                            )}
                          </div>
                          <input 
                            type="text" 
                            value={activeProject.cover || ""}
                            onChange={(e) => updateProject(activeProject.id, { cover: e.target.value })}
                            className="w-full p-3 bg-white border border-neutral-200 rounded-xl text-xs font-mono"
                            placeholder="Cover Image URL..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gallery */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Gallery Media</h3>
                      <button 
                        onClick={() => {
                          const newItem: MediaItem = { id: `m-${Date.now()}`, type: 'image', url: '' };
                          updateProject(activeProject.id, { gallery: [...activeProject.gallery, newItem] });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-black bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
                      >
                        <Plus size={14} /> Add Gallery Item
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {activeProject.gallery.length === 0 && (
                        <div className="p-8 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400 text-sm">
                          No gallery items yet.
                        </div>
                      )}
                      {activeProject.gallery.map((item, index) => (
                        <MediaAssetRow 
                          key={item.id}
                          item={item}
                          onUpdate={(updates) => {
                            const newGallery = [...activeProject.gallery];
                            newGallery[index] = { ...item, ...updates };
                            updateProject(activeProject.id, { gallery: newGallery });
                          }}
                          onDelete={() => {
                            if (window.confirm('Remove this gallery item?')) {
                              const newGallery = activeProject.gallery.filter(g => g.id !== item.id);
                              updateProject(activeProject.id, { gallery: newGallery });
                            }
                          }}
                          onMoveUp={index > 0 ? () => {
                            const newGallery = [...activeProject.gallery];
                            [newGallery[index - 1], newGallery[index]] = [newGallery[index], newGallery[index - 1]];
                            updateProject(activeProject.id, { gallery: newGallery });
                          } : undefined}
                          onMoveDown={index < activeProject.gallery.length - 1 ? () => {
                            const newGallery = [...activeProject.gallery];
                            [newGallery[index], newGallery[index + 1]] = [newGallery[index + 1], newGallery[index]];
                            updateProject(activeProject.id, { gallery: newGallery });
                          } : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Additional Assets */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Additional Project Assets</h3>
                      <button 
                        onClick={() => {
                          const newItem: MediaItem = { id: `a-${Date.now()}`, type: 'image', url: '' };
                          const currentAssets = activeProject.additionalAssets || [];
                          updateProject(activeProject.id, { additionalAssets: [...currentAssets, newItem] });
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-black bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
                      >
                        <Plus size={14} /> Add Asset
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {(!activeProject.additionalAssets || activeProject.additionalAssets.length === 0) && (
                        <div className="p-8 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-neutral-400 text-sm">
                          No additional assets.
                        </div>
                      )}
                      {activeProject.additionalAssets?.map((item, index) => (
                        <MediaAssetRow 
                          key={item.id}
                          item={item}
                          onUpdate={(updates) => {
                            const newAssets = [...(activeProject.additionalAssets || [])];
                            newAssets[index] = { ...item, ...updates };
                            updateProject(activeProject.id, { additionalAssets: newAssets });
                          }}
                          onDelete={() => {
                            if (window.confirm('Remove this asset?')) {
                              const newAssets = (activeProject.additionalAssets || []).filter(g => g.id !== item.id);
                              updateProject(activeProject.id, { additionalAssets: newAssets });
                            }
                          }}
                          onMoveUp={index > 0 ? () => {
                            const newAssets = [...(activeProject.additionalAssets || [])];
                            [newAssets[index - 1], newAssets[index]] = [newAssets[index], newAssets[index - 1]];
                            updateProject(activeProject.id, { additionalAssets: newAssets });
                          } : undefined}
                          onMoveDown={index < (activeProject.additionalAssets?.length || 0) - 1 ? () => {
                            const newAssets = [...(activeProject.additionalAssets || [])];
                            [newAssets[index], newAssets[index + 1]] = [newAssets[index + 1], newAssets[index]];
                            updateProject(activeProject.id, { additionalAssets: newAssets });
                          } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                {/* Section: Settings */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                    <Settings size={18} className="text-neutral-400" />
                    <h2 className="text-lg font-bold">Project Settings</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Star size={18} className={activeProject.featured ? "text-amber-400 fill-amber-400" : "text-neutral-300"} />
                          <div>
                            <p className="text-sm font-bold">Featured Project</p>
                            <p className="text-xs text-neutral-400">Show prominently in portfolio</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => updateProject(activeProject.id, { featured: !activeProject.featured })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            activeProject.featured ? "bg-black" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            activeProject.featured ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          {activeProject.visible ? <Eye size={18} className="text-neutral-600" /> : <EyeOff size={18} className="text-neutral-300" />}
                          <div>
                            <p className="text-sm font-bold">Visibility</p>
                            <p className="text-xs text-neutral-400">Publicly visible on website</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => updateProject(activeProject.id, { visible: !activeProject.visible })}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            activeProject.visible ? "bg-black" : "bg-neutral-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            activeProject.visible ? "left-7" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">Sort Order</label>
                        <input 
                          type="number" 
                          value={activeProject.sortOrder}
                          onChange={(e) => updateProject(activeProject.id, { sortOrder: parseInt(e.target.value) || 0 })}
                          className="w-full p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-neutral-400">Accent Color</label>
                        <div className="flex gap-3">
                          <input 
                            type="color" 
                            value={activeProject.accentColor || "#000000"}
                            onChange={(e) => updateProject(activeProject.id, { accentColor: e.target.value })}
                            className="w-12 h-12 p-1 bg-white border border-neutral-200 rounded-xl cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={activeProject.accentColor || ""}
                            onChange={(e) => updateProject(activeProject.id, { accentColor: e.target.value })}
                            className="flex-1 p-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-mono text-sm"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-neutral-400 space-y-4">
                <LayoutGrid size={64} strokeWidth={1} />
                <p className="text-lg font-medium">Select a project to start editing</p>
                <button 
                  onClick={addProject}
                  className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-neutral-800 transition-colors"
                >
                  Create Your First Project
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Messages */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={cn(
                "fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50",
                message.type === 'success' ? "bg-black text-white" : 
                message.type === 'error' ? "bg-red-600 text-white" : "bg-neutral-800 text-white"
              )}
            >
              {message.type === 'success' ? <Check size={18} /> : 
               message.type === 'error' ? <AlertCircle size={18} /> : <Settings size={18} />}
              <span className="text-sm font-bold">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
