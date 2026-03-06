// This service is intentionally independent from analysisService so that
// the postpartum feature can be configured locally without touching shared
// networking code.  It reads the same environment variable used elsewhere
// (`REACT_APP_API_BASE_URL` / `EXPO_PUBLIC_API_URL`) but builds its own URL.

import { Platform } from 'react-native';

const envHost = process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_API_BASE_URL || '';

const getCandidateBaseUrls = (): string[] => {
  const urls = new Set<string>();

  if (envHost) {
    urls.add(`http://${envHost}`);
  }

  if (Platform.OS === 'web') {
    urls.add('http://localhost:8000');
    urls.add('http://127.0.0.1:8000');
  } else {
    urls.add('http://10.0.2.2:8000');
    urls.add('http://localhost:8000');
    urls.add('http://127.0.0.1:8000');
    urls.add('http://192.168.8.119:8000');
  }

  return Array.from(urls);
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 5000): Promise<Response> => {
  return await Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
};

const postJsonWithFallback = async <T>(path: string, body: unknown): Promise<T> => {
  const candidates = getCandidateBaseUrls();
  const errors: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const url = `${baseUrl}${path}`;
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }, 5000);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      errors.push(`${baseUrl} -> ${String(error)}`);
    }
  }

  throw new Error(`Postpartum API unreachable. Tried: ${errors.join(' | ')}`);
};

const getJsonWithFallback = async <T>(path: string): Promise<T> => {
  const candidates = getCandidateBaseUrls();
  const errors: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const url = `${baseUrl}${path}`;
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }, 5000);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      errors.push(`${baseUrl} -> ${String(error)}`);
    }
  }

  throw new Error(`Postpartum API unreachable. Tried: ${errors.join(' | ')}`);
};

export interface PostpartumPayload {
  age: number;
  weeks_since_delivery: number;
  delivery_type: string;
  parenting_type: string;
  pain_pattern: string;
  healing_progress: string;
  sleep_hours: string;
  daytime_fatigue_score: number;
  baby_sleep_pattern: string;
  meals_per_day: string;
  protein_intake: string;
  iron_intake: string;
  fluid_intake: string;
  fruit_veg_intake: string;
  physical_activity: string;
  feeding_posture: string;
  lifting_posture: string;
}

export interface PostpartumResult {
  predictions?: {
    perineal?: { score: number; risk: string };
    csection?: { score: number; risk: string };
    back_pelvic?: { score: number; risk: string };
  };
  guidance?: {
    model_based?: string[];
    general_care?: string[];
  };
  top_factors?: string[];
  created_at?: string;
}

export interface PostpartumHistoryItem {
  id: string;
  created_at?: string;
  input?: PostpartumPayload;
  predictions?: PostpartumResult['predictions'];
  top_factors?: string[];
  guidance?: PostpartumResult['guidance'];
}

export interface PostpartumDashboardData {
  total_records: number;
  period_days: number;
  avg_scores: {
    perineal: number;
    csection: number;
    back_pelvic: number;
  };
  risk_distribution: {
    LOW: number;
    MODERATE: number;
    HIGH: number;
  };
  trend: Array<{
    date: string;
    count: number;
  }>;
}

// ==========================================
// Local Caching for Offline Support
// ==========================================
const LOCAL_CACHE_KEY = '@postpartum_predictions';

const saveToLocalCache = async (item: PostpartumHistoryItem): Promise<void> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const existing = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
    const items = existing ? JSON.parse(existing) : [];
    items.push(item);
    // Keep only last 100 items
    const limited = items.slice(-100);
    await AsyncStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(limited));
  } catch (e) {
    console.warn('Could not save to local cache:', e);
  }
};

const getLocalCache = async (): Promise<PostpartumHistoryItem[]> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const data = await AsyncStorage.getItem(LOCAL_CACHE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn('Could not read local cache:', e);
    return [];
  }
};

// ==========================================
// API Functions
// ==========================================

export const submitPostpartum = async (
  payload: PostpartumPayload
): Promise<PostpartumResult> => {
  const result = await postJsonWithFallback<PostpartumResult>('/postpartum/predict', payload);
  
  // Also save to local cache as a fallback
  const cacheItem: PostpartumHistoryItem = {
    id: `local_${Date.now()}`,
    created_at: result.created_at || new Date().toISOString(),
    input: payload,
    predictions: result.predictions,
    top_factors: result.top_factors || [],
    guidance: result.guidance,
  };
  
  await saveToLocalCache(cacheItem);
  
  return result;
};

export const getPostpartumHistory = async (
  limit: number = 20
): Promise<PostpartumHistoryItem[]> => {
  try {
    // Try to get from backend first
    const result = await getJsonWithFallback<PostpartumHistoryItem[]>(`/postpartum/history?limit=${limit}`);
    // If backend returns anything (empty array is ok), return it
    if (Array.isArray(result)) {
      return result.slice(0, limit);
    }
  } catch (error) {
    console.warn('Backend unavailable, falling back to local cache:', error);
  }
  
  // Fall back to local cache
  const cached = await getLocalCache();
  return cached.slice(0, limit);
};

export const getPostpartumDashboard = async (
  days: number = 30
): Promise<PostpartumDashboardData> => {
  try {
    return await getJsonWithFallback<PostpartumDashboardData>(`/postpartum/dashboard?days=${days}`);
  } catch (error) {
    console.warn('Dashboard API unavailable, generating from local cache:', error);
    
    // Generate dashboard data from local cache as fallback
    const cached = await getLocalCache();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentItems = cached.filter(item => {
      if (!item.created_at) return true;
      return new Date(item.created_at) >= cutoffDate;
    });
    
    const avgScores = { perineal: 0, csection: 0, back_pelvic: 0 };
    const scoreCounts = { perineal: 0, csection: 0, back_pelvic: 0 };
    const riskDistribution = { LOW: 0, MODERATE: 0, HIGH: 0 };
    
    recentItems.forEach(item => {
      if (item.predictions) {
        ['perineal', 'csection', 'back_pelvic'].forEach(painKey => {
          const pred = item.predictions?.[painKey as keyof typeof item.predictions];
          if (pred && typeof pred.score === 'number') {
            avgScores[painKey as keyof typeof avgScores] += pred.score;
            scoreCounts[painKey as keyof typeof scoreCounts]++;
          }
          if (pred?.risk && pred.risk in riskDistribution) {
            riskDistribution[pred.risk as keyof typeof riskDistribution]++;
          }
        });
      }
    });
    
    // Calculate averages
    Object.keys(avgScores).forEach(key => {
      if (scoreCounts[key as keyof typeof scoreCounts] > 0) {
        avgScores[key as keyof typeof avgScores] /= scoreCounts[key as keyof typeof scoreCounts];
      }
    });
    
    // Generate trend data
    const trendMap: { [date: string]: number } = {};
    recentItems.forEach(item => {
      if (item.created_at) {
        const date = new Date(item.created_at).toISOString().split('T')[0];
        trendMap[date] = (trendMap[date] || 0) + 1;
      }
    });
    
    const trend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
    
    return {
      total_records: recentItems.length,
      period_days: days,
      avg_scores: avgScores,
      risk_distribution: riskDistribution,
      trend: trend,
    };
  }
};
