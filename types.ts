
export enum Unit {
  BOTTLE = '瓶',
  BAG = '袋',
  PLATE = '皿'
}

export interface SpeciesConfig {
  id: string;
  name: string;
  abbreviation: string;
  colorTheme?: string; 
  colorHex?: string;
}

export interface OperationConfig {
  id: string;
  name: string;
  colorTheme?: string; 
  colorHex?: string;
}

export interface StatusConfig {
  id: string;
  name: string;
  colorHex: string;
}

export type Language = 'zh' | 'en';

export interface UserConfigs {
  species: SpeciesConfig[];
  operations: OperationConfig[];
  statuses: StatusConfig[];
  recipeTypes: string[];
  language?: Language;
}

export interface RecipeEntry {
  id: string;
  name: string;
  type: string;
  ingredients?: string; // 新增：配料清单
  directions: string;
  created_at?: string;
}

export interface NoteEntry {
  id: string;
  name: string;
  notes: string;
  created_at?: string;
}

export interface Batch {
  id: string; 
  displayId: string; 
  createdDate: string; 
  species: string;
  operationType: string;
  quantity: number;
  unit: string; // Required by database schema
  parentId: string | null; 
  endDate?: string;
  outcome?: string; 
  notes?: string;
  imageUrls?: string[]; 
}

// Added ChartDataPoint for environment tracking charts to fix import error in EnvironmentChart.tsx
export interface ChartDataPoint {
  date: string;
  temp: number;
  humidity: number;
}

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  BATCH_DETAIL = 'BATCH_DETAIL',
  NEW_OPERATION = 'NEW_OPERATION',
  SETTINGS = 'SETTINGS',
  STATS = 'STATS',
  NOTEBOOK = 'NOTEBOOK'
}
