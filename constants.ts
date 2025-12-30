
import React from 'react';
import { SpeciesConfig, OperationConfig, StatusConfig, Language } from './types';
import { FlaskConical, Wheat, Sprout, Disc, Microscope, Circle, Scale, Layers, Syringe, TestTubes, Notebook as NotebookIcon, StickyNote, BookOpen } from 'lucide-react';

export const DEFAULT_SPECIES_LIST: SpeciesConfig[] = [
  { id: '1', name: 'Oyster Blue', abbreviation: 'OB', colorHex: '#3b82f6' },
  { id: '2', name: 'Oyster Tan', abbreviation: 'OT', colorHex: '#eab308' },
  { id: '3', name: 'Oyster Warm White', abbreviation: 'OWW', colorHex: '#6b7280' },
  { id: '4', name: 'Oyster King of Pearl', abbreviation: 'OKP', colorHex: '#9ca3af' },
  { id: '5', name: 'Oyster Pink', abbreviation: 'OP', colorHex: '#ef4444' },
  { id: '6', name: "Lions' Mane", abbreviation: 'LM', colorHex: '#22c55e' }
];

export const DEFAULT_OPERATION_LIST: OperationConfig[] = [
  { id: '1', name: 'Agar work', colorHex: '#a855f7' },      
  { id: '2', name: 'Agar to grain', colorHex: '#8b5cf6' },  
  { id: '3', name: 'Agar to LC', colorHex: '#6366f1' },     
  { id: '4', name: 'Fresh to grain', colorHex: '#10b981' }, 
  { id: '5', name: 'LC to grain', colorHex: '#0ea5e9' },    
  { id: '6', name: 'LC expansion', colorHex: '#3b82f6' },   
  { id: '7', name: 'Grain expansion', colorHex: '#eab308' },
  { id: '8', name: 'Grain to substrate', colorHex: '#f97316' }, 
  { id: '9', name: 'Harvest', colorHex: '#16a34a' } 
];

export const DEFAULT_STATUS_LIST: StatusConfig[] = [
  { id: '1', name: '健康', colorHex: '#22c55e' },
  { id: '2', name: '轻微感染', colorHex: '#eab308' },
  { id: '3', name: '感染废弃', colorHex: '#ef4444' }
];

export const DEFAULT_RECIPE_TYPES = ['Agar', 'Liquid Culture', 'Grain', 'Substrate'];

export const TRANSLATIONS = {
  zh: {
    nav_log: '记录',
    nav_stats: '统计',
    nav_new: '新建',
    nav_config: '配置',
    nav_notebook: '记事本',
    header_title: '蘑菇日志',
    sign_out: '退出登录',
    recipe_tab: '配方库',
    others_tab: '杂项笔记',
    search_placeholder: '搜索名称、配料、步骤...',
    add_recipe: '新增配方',
    add_note: '新增笔记',
    recipe_name: '配方名称',
    recipe_type: '配方类别',
    recipe_ingredients: '配料清单',
    directions: '制作步骤',
    note_name: '标题',
    note_content: '备注内容',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    lang_toggle: '语言切换',
    online_manage: '数据库管理',
    export_csv: '导出数据 (CSV)',
    storage_tab: '存储',
    date: '日期',
    confirm_q: '确定要执行此操作吗？',
    placeholder_add_name: '输入名称...',
    species_tab: '菌种',
    operations_tab: '操作步骤',
    statuses_tab: '生长状态',
    data_tab: '数据管理',
    prefs_tab: '语言',
    storage_hint: '这将从云端存储中永久删除选定日期之前的照片。',
    view_timeline: 'VIEW TIMELINE',
    growing_timeline: 'Growing Timeline',
    contamination_title: 'Contamination'
  },
  en: {
    nav_log: 'Log',
    nav_stats: 'Stats',
    nav_new: 'New',
    nav_config: 'Config',
    nav_notebook: 'Notebook',
    header_title: 'Mushroom Log',
    sign_out: 'Sign Out',
    recipe_tab: 'Recipes',
    others_tab: 'Misc Notes',
    search_placeholder: 'Search name, ingredients...',
    add_recipe: 'Add Recipe',
    add_note: 'Add Note',
    recipe_name: 'Recipe Name',
    recipe_type: 'Type',
    recipe_ingredients: 'Ingredients',
    directions: 'Directions',
    note_name: 'Title',
    note_content: 'Notes',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    lang_toggle: 'Language',
    online_manage: 'Online Management',
    export_csv: 'Export CSV',
    storage_tab: 'Storage',
    date: 'Date',
    confirm_q: 'Are you sure?',
    placeholder_add_name: 'Enter name...',
    species_tab: 'Species',
    operations_tab: 'Operations',
    statuses_tab: 'Statuses',
    data_tab: 'Data',
    prefs_tab: 'Language',
    storage_hint: 'Delete photos before selected date.',
    view_timeline: 'VIEW TIMELINE',
    growing_timeline: 'Growing Timeline',
    contamination_title: 'Contamination'
  }
};

export const useTranslation = (lang: Language = 'zh') => {
  return (key: keyof typeof TRANSLATIONS.zh) => TRANSLATIONS[lang][key] || key;
};

export const getStylesForColor = (hex?: string, fallbackTheme?: string) => {
  if (hex) {
    return {
      bg: { backgroundColor: `${hex}1A`, color: hex, borderColor: `${hex}33` },
      badge: { backgroundColor: `${hex}26`, color: hex, borderColor: `${hex}4D` },
      text: { color: hex },
      border: { borderColor: hex },
      solid: { backgroundColor: hex, color: '#fff' }
    };
  }
  return {
    bg: { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' },
    badge: { backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' },
    text: { color: '#4b5563' },
    border: { borderColor: '#e5e7eb' },
    solid: { backgroundColor: '#4b5563', color: '#fff' }
  };
};

export const getIconForOp = (opName?: string) => {
  if (!opName) return Circle;
  const n = opName.toLowerCase();
  if (n.includes('harvest')) return Sprout;
  if (n.includes('lc') && n.includes('expansion')) return TestTubes;
  if (n.includes('agar') || n.includes('plate') || n.includes('dish')) return Disc;
  if (n.includes('lc') || n.includes('liquid') || n.includes('culture')) return FlaskConical;
  if (n.includes('grain') || n.includes('spawn') || n.includes('seed')) return Wheat;
  if (n.includes('substrate') || n.includes('bulk') || n.includes('fruit')) return Layers;
  if (n.includes('micro') || n.includes('lab') || n.includes('fresh')) return Microscope;
  return Circle;
};
