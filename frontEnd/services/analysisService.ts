import { Platform } from 'react-native';

const normalizeBaseUrl = (value?: string): string => {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'http://localhost:8000';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
};

const BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.REACT_APP_API_BASE_URL
);

const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`;
const FUSION_API = `${BASE_URL}/fusion/predict`;

export interface AudioResult {
  label: string;
  confidence: number;
  message?: string;
}

export interface FaceResult {
  label: string;
  confidence: number;
  message?: string;
  pain_probability?: number;
}

export interface FusionResult {
  predicted_cry_reason: string;
  confidence: number;
  confidence_level: 'Low' | 'Medium' | 'High' | string;
  confidence_message?: string;
  context_info?: string;
  all_class_probabilities?: Record<string, number>;
  disclaimer?: string;
  model_disagreement?: boolean;
}

export interface FusionContext {
  baby_age_months: number;
  time_since_feed_hours: number;
  time_since_sleep_hours: number;
  diaper_status: string;
  room_temperature_celsius: number;
}

export interface FusionPayload extends FusionContext {
  audio_predicted_class: string;
  audio_confidence: number;
  image_predicted_class: string;
  image_confidence: number;
}

export const mapAudioLabel = (label?: string): string => {
  const normalized = (label || '').toLowerCase();
  if (normalized === 'pain_cry') return 'Pain';
  if (normalized === 'hunger_cry') return 'Hunger';
  if (normalized === 'normal_cry') return 'Normal';
  return 'Unknown';
};

export const mapFaceLabel = (label?: string): string => {
  const normalized = (label || '').toLowerCase();
  if (normalized === 'pain_expression') return 'Pain';
  if (normalized === 'no_pain' || normalized === 'no-pain') return 'No-Pain';
  return 'Unknown';
};

export const normalizeConfidence = (value: number | string | null | undefined): number => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return num > 1 ? num / 100 : num;
};

export const analyzeAudio = async (
  audioUri: string,
  abortSignal?: AbortSignal
): Promise<AudioResult> => {
  console.log('Starting audio analysis for:', audioUri);
  console.log('Audio API URL:', AUDIO_API);

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    formData.append('file', blob, 'audio.webm');
  } else {
    formData.append(
      'file',
      {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any
    );
  }

  const response = await fetch(AUDIO_API, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
    signal: abortSignal,
  });

  const contentType = response.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(json?.detail || `Audio analysis failed (${response.status})`);
  }

  if (!json) {
    throw new Error(`Unexpected audio response format (${response.status})`);
  }

  return {
    label: json.label,
    confidence: normalizeConfidence(json.confidence),
    message: json.message,
  };
};

export const analyzeFace = async (
  faceUri: string,
  abortSignal?: AbortSignal
): Promise<FaceResult> => {
  console.log('Starting face analysis for:', faceUri);
  console.log('Face API URL:', FACE_API);

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(faceUri);
    const blob = await response.blob();
    formData.append('file', blob, 'face.jpg');
  } else {
    formData.append(
      'file',
      {
        uri: faceUri,
        name: 'face.jpg',
        type: 'image/jpeg',
      } as any
    );
  }

  const response = await fetch(FACE_API, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
    signal: abortSignal,
  });

  const contentType = response.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(json?.detail || `Face analysis failed (${response.status})`);
  }

  if (!json) {
    throw new Error(`Unexpected face response format (${response.status})`);
  }

  return {
    label: json.label,
    confidence: normalizeConfidence(json.confidence),
    message: json.message,
    pain_probability: json.pain_probability,
  };
};

export const runFusion = async (
  payload: FusionPayload,
  abortSignal?: AbortSignal
): Promise<FusionResult> => {
  console.log('Starting fusion analysis with payload:', payload);
  console.log('Fusion API URL:', FUSION_API);

  const response = await fetch(FUSION_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: abortSignal,
  });

  let json;
  if (response.status === 404) {
    const fallbackResponse = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: abortSignal,
    });

    const fallbackContentType = fallbackResponse.headers.get('content-type') || '';
    json = fallbackContentType.includes('application/json') ? await fallbackResponse.json() : null;

    if (!fallbackResponse.ok) {
      throw new Error(json?.detail || `Fusion analysis failed (${fallbackResponse.status})`);
    }
  } else {
    const contentType = response.headers.get('content-type') || '';
    json = contentType.includes('application/json') ? await response.json() : null;

    if (!response.ok) {
      throw new Error(json?.detail || `Fusion analysis failed (${response.status})`);
    }
  }

  if (!json) {
    throw new Error('Unexpected fusion response format');
  }

  return json;
};

export const performCompleteAnalysis = async (
  audioUri: string | null,
  faceUri: string | null,
  context: FusionContext,
  abortSignal?: AbortSignal
): Promise<{
  audioResult?: AudioResult;
  faceResult?: FaceResult;
  fusionResult?: FusionResult;
  finalPrediction: string;
  finalConfidence: number;
}> => {
  console.log('Starting complete analysis');
  console.log('Resolved backend base URL:', BASE_URL);
  console.log('Audio URI:', audioUri);
  console.log('Face URI:', faceUri);
  console.log('Context:', context);

  let audioResult: AudioResult | undefined;
  let faceResult: FaceResult | undefined;

  if (audioUri) {
    try {
      audioResult = await analyzeAudio(audioUri, abortSignal);
    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw new Error(`Audio analysis failed: ${error}`);
    }
  }

  if (faceUri) {
    try {
      faceResult = await analyzeFace(faceUri, abortSignal);
    } catch (error) {
      console.error('Face analysis failed:', error);
      throw new Error(`Face analysis failed: ${error}`);
    }
  }

  if (audioResult || faceResult) {
    try {
      const fusionPayload: FusionPayload = {
        ...context,
        audio_predicted_class: audioResult ? mapAudioLabel(audioResult.label) : 'Unknown',
        audio_confidence: audioResult ? audioResult.confidence : 0,
        image_predicted_class: faceResult ? mapFaceLabel(faceResult.label) : 'Unknown',
        image_confidence: faceResult ? faceResult.confidence : 0,
      };

      const fusionResult = await runFusion(fusionPayload, abortSignal);

      return {
        audioResult,
        faceResult,
        fusionResult,
        finalPrediction: fusionResult.predicted_cry_reason || 'Unknown',
        finalConfidence: normalizeConfidence(fusionResult.confidence),
      };
    } catch (error) {
      console.error('Fusion analysis failed:', error);
      throw new Error(`Fusion analysis failed: ${error}`);
    }
  }

  throw new Error('No analysis data available - please provide audio or face data');
};

export const validateContext = (context: Partial<FusionContext>): string[] => {
  const errors: string[] = [];

  if (!context.baby_age_months || context.baby_age_months < 0 || context.baby_age_months > 36) {
    errors.push('Baby age must be between 0-36 months');
  }

  if (context.time_since_feed_hours === undefined || context.time_since_feed_hours < 0) {
    errors.push('Time since feed must be provided and >= 0');
  }

  if (context.time_since_sleep_hours === undefined || context.time_since_sleep_hours < 0) {
    errors.push('Time since sleep must be provided and >= 0');
  }

  if (!context.diaper_status) {
    errors.push('Diaper status must be provided');
  }

  if (
    context.room_temperature_celsius !== undefined &&
    (context.room_temperature_celsius < 5 || context.room_temperature_celsius > 35)
  ) {
    errors.push('Room temperature must be between 5-35C');
  }

  return errors;
};
