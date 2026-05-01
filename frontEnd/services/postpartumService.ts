import { Platform } from 'react-native';

const getCandidateBaseUrls = (): string[] => {
    const urls = new Set<string>();
    if (Platform.OS === 'web') {
        urls.add('http://localhost:9000');
        urls.add('http://127.0.0.1:9000');
    } else {
        urls.add('http://10.0.2.2:9000');
        urls.add('http://localhost:9000');
        urls.add('http://192.168.8.119:9000');
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
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
    avg_scores: { perineal: number; csection: number; back_pelvic: number };
    risk_distribution: { LOW: number; MODERATE: number; HIGH: number };
    trend: Array<{ date: string; count: number }>;
}

export const submitPostpartum = async (payload: PostpartumPayload): Promise<PostpartumResult> => {
    return await postJsonWithFallback<PostpartumResult>('/postpartum/predict', payload);
};

export const getPostpartumHistory = async (limit: number = 20): Promise<PostpartumHistoryItem[]> => {
    try {
        const result = await getJsonWithFallback<PostpartumHistoryItem[]>(`/postpartum/history?limit=${limit}`);
        if (Array.isArray(result)) return result.slice(0, limit);
    } catch (error) {
        console.warn('Backend unavailable:', error);
    }
    return [];
};

export const getPostpartumDashboard = async (days: number = 30): Promise<PostpartumDashboardData> => {
    return await getJsonWithFallback<PostpartumDashboardData>(`/postpartum/dashboard?days=${days}`);
};
