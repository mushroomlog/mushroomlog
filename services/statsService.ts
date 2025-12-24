
import { Batch, UserConfigs } from '../types';

export type TimeRange = 'ALL' | 'YEAR' | 'MONTH' | 'WEEK' | 'CUSTOM';

export interface DateFilter {
  type: TimeRange;
  startDate?: string;
  endDate?: string;
}

// Helper to filter batches by date range and species
export const filterBatches = (batches: Batch[], dateFilter: DateFilter, speciesId?: string, userConfigs?: UserConfigs) => {
  const now = new Date();
  let start = new Date(0); // Epoch
  let end = new Date(); // Now

  if (dateFilter.type === 'YEAR') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (dateFilter.type === 'MONTH') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateFilter.type === 'WEEK') {
    start = new Date(now.setDate(now.getDate() - 7));
  } else if (dateFilter.type === 'CUSTOM' && dateFilter.startDate && dateFilter.endDate) {
    start = new Date(dateFilter.startDate);
    end = new Date(dateFilter.endDate);
    end.setHours(23, 59, 59, 999); // End of day
  }

  return batches.filter(b => {
    const bDate = new Date(b.createdDate);
    const dateMatch = bDate >= start && bDate <= end;
    
    let speciesMatch = true;
    if (speciesId && userConfigs) {
      const sp = userConfigs.species.find(s => s.id === speciesId);
      if (sp) speciesMatch = b.species === sp.name;
    }

    return dateMatch && speciesMatch;
  });
};

// --- YIELD STATS ---
export interface YieldStat {
  speciesName: string;
  totalWeight: number;
  batchCount: number;
}

export const calculateYieldStats = (batches: Batch[]) => {
  const harvestBatches = batches.filter(b => b.operationType === 'Harvest');
  const totalWeight = harvestBatches.reduce((sum, b) => sum + b.quantity, 0);

  // Group by species
  const bySpecies: Record<string, number> = {};
  harvestBatches.forEach(b => {
    bySpecies[b.species] = (bySpecies[b.species] || 0) + b.quantity;
  });

  const speciesStats: YieldStat[] = Object.entries(bySpecies).map(([name, weight]) => ({
    speciesName: name,
    totalWeight: weight,
    batchCount: harvestBatches.filter(b => b.species === name).length
  })).sort((a, b) => b.totalWeight - a.totalWeight);

  return {
    totalWeight,
    speciesStats,
    harvestCount: harvestBatches.length
  };
};

// --- CONTAMINATION STATS ---
export const calculateHealthStats = (batches: Batch[]) => {
  // Define "Bad" outcomes - simplistic check for keywords or specific status names
  // In a real app, maybe Config should have a "isFailure" flag
  const isContam = (outcome?: string) => {
    if (!outcome) return false;
    const lower = outcome.toLowerCase();
    return lower.includes('contam') || lower.includes('discard') || lower.includes('fail') || lower.includes('污染') || lower.includes('废弃');
  };

  const total = batches.length;
  const contaminated = batches.filter(b => isContam(b.outcome));
  const rate = total === 0 ? 0 : (contaminated.length / total) * 100;

  return {
    totalBatches: total,
    contaminatedBatches: contaminated,
    contaminationRate: rate
  };
};

// --- ACTIVE PIPELINE ---
export const calculatePipelineStats = (batches: Batch[]) => {
  // Active = Not Harvest, Not Discarded, Not Ended
  // Simpler logic: latest status is not "completed"
  
  // Helper: check if outcome implies "Done" (like Discarded)
  const isDiscarded = (outcome?: string) => {
      if (!outcome) return false;
      const lower = outcome.toLowerCase();
      return lower.includes('discard') || lower.includes('废弃');
  };

  const activeBatches = batches.filter(b => {
      // 1. Must not be Harvest (that's end of line)
      if (b.operationType === 'Harvest') return false;
      // 2. Must not be Discarded
      if (isDiscarded(b.outcome)) return false;
      // 3. Must not have an End Date (explicitly closed)
      if (b.endDate) return false;
      
      return true;
  });

  // Group by Operation
  const byStage: Record<string, Batch[]> = {};
  activeBatches.forEach(b => {
      if (!byStage[b.operationType]) byStage[b.operationType] = [];
      byStage[b.operationType].push(b);
  });

  return {
      activeCount: activeBatches.length,
      byStage
  };
};
