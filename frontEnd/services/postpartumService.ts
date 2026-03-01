// This service is intentionally independent from analysisService so that
// the postpartum feature can be configured locally without touching shared
// networking code.  It reads the same environment variable used elsewhere
// (`REACT_APP_API_BASE_URL` / `EXPO_PUBLIC_API_URL`) but builds its own URL.

import { Platform } from 'react-native';

// derive base URL from environment, with safe defaults for development devices
const BASE_URL = Platform.OS === 'web'
  ? `http://${process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_API_BASE_URL || 'localhost:8000'}`
  : `http://${process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_API_BASE_URL || '192.168.8.119:8000'}`;

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
}

export const submitPostpartum = async (
  payload: PostpartumPayload
): Promise<PostpartumResult> => {
  const url = `${BASE_URL}/postpartum/predict`;
  console.log('➡️ POST', url, payload);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return {} as PostpartumResult;
};
