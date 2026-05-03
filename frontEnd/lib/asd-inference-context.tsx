import React, { createContext, useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export type InferenceState = 'idle' | 'running' | 'done' | 'error';
export type ResultParams   = Record<string, string>;

export interface InferenceInput {
  videoUri: string | null;
  answers:  Record<string, number>;
}

interface AsdInferenceContextValue {
  state:        InferenceState;
  status:       string;
  resultParams: ResultParams | null;
  errorMsg:     string;
  start:        (input: InferenceInput) => Promise<void>;
  retry:        () => Promise<void>;
  clear:        () => void;
}

const AsdInferenceContext = createContext<AsdInferenceContextValue | null>(null);

export function AsdInferenceProvider({ children }: { children: React.ReactNode }) {
  const [state,        setState]        = useState<InferenceState>('idle');
  const [status,       setStatus]       = useState('');
  const [resultParams, setResultParams] = useState<ResultParams | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [lastInput,    setLastInput]    = useState<InferenceInput | null>(null);

  const runPipeline = useCallback(async (input: InferenceInput) => {
    const { videoUri, answers } = input;
    setState('running');
    setErrorMsg('');
    setResultParams(null);
    setLastInput(input);

    try {
      let p_facial = 0;
      let frame_urls: string[] = [];

      if (videoUri) {
        try {
          setStatus('Analysing video for facial features…');

          let fileData: any;
          if (Platform.OS === 'web') {
            const response = await fetch(videoUri);
            fileData = await response.blob();
          } else {
            fileData = { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' };
          }

          const form = new FormData();
          form.append('file', fileData, Platform.OS === 'web' ? 'asd_video.mp4' : undefined);

          const vRes  = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
          const vData = await vRes.json();
          if (!vRes.ok) {
            const detail = Array.isArray(vData.detail)
              ? vData.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join('; ')
              : vData.detail;
            throw new Error(`Video analysis failed (${vRes.status}): ${detail}`);
          }
          p_facial   = vData.asd_probability ?? 0;
          frame_urls = vData.frame_urls       ?? [];
        } catch (videoError) {
          console.warn('⚠️ Video analysis failed, using fallback:', videoError);
          p_facial   = 0;
          frame_urls = [];
        }
      }

      setStatus('Analysing questionnaire responses…');
      const payload = {
        A1: answers['A1'] ?? 0, A2: answers['A2'] ?? 0, A3: answers['A3'] ?? 0,
        A4: answers['A4'] ?? 0, A5: answers['A5'] ?? 0, A6: answers['A6'] ?? 0,
        A7: answers['A7'] ?? 0, A8: answers['A8'] ?? 0, A9: answers['A9'] ?? 0,
        A10: answers['A10'] ?? 0,
        Sex_M:                   answers['Sex_M']                   ?? 0,
        Family_mem_with_ASD_Yes: answers['Family_mem_with_ASD_Yes'] ?? 0,
      };
      const qRes        = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const qData       = await qRes.json();
      const p_qchat     = qData.asd_probability ?? 0;
      const qchat_score = qData.qchat_score     ?? 0;

      setStatus('Computing fused prediction…');
      const fRes  = await fetch(`${API_BASE}/api/asd/predict-fused`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_facial, p_qchat, qchat_score, qchat_answers: payload, frame_urls }),
      });
      const fData = await fRes.json();

      setResultParams({
        p_facial:       String(p_facial),
        p_qchat:        String(p_qchat),
        qchat_score:    String(qchat_score),
        fused_prob:     String(fData.fused_probability ?? 0),
        risk_level:     fData.risk_level     ?? 'Low',
        risk_color:     fData.risk_color      ?? 'green',
        recommendation: fData.recommendation ?? '',
        qchat_label:    qData.label           ?? 'Low ASD Risk',
        facial_label:   p_facial >= 0.06 ? 'ASD Risk Detected' : 'Low ASD Risk',
      });
      setState('done');
    } catch (e: any) {
      console.warn('Inference failed:', e);
      setErrorMsg(e?.message || 'Could not connect to the server. Please check your connection and try again.');
      setState('error');
    }
  }, []);

  const start = useCallback(async (input: InferenceInput) => {
    if (state === 'running') return;
    await runPipeline(input);
  }, [state, runPipeline]);

  const retry = useCallback(async () => {
    if (!lastInput) return;
    await runPipeline(lastInput);
  }, [lastInput, runPipeline]);

  const clear = useCallback(() => {
    setState('idle');
    setStatus('');
    setResultParams(null);
    setErrorMsg('');
  }, []);

  return (
    <AsdInferenceContext.Provider value={{ state, status, resultParams, errorMsg, start, retry, clear }}>
      {children}
    </AsdInferenceContext.Provider>
  );
}

export function useAsdInference(): AsdInferenceContextValue {
  const ctx = useContext(AsdInferenceContext);
  if (!ctx) throw new Error('useAsdInference must be used within AsdInferenceProvider');
  return ctx;
}
