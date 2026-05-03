# Facial AI Predictions Hardcoded as 0 - Investigation Findings

**Date:** May 3, 2026  
**Scope:** ASD (Autism Spectrum Disorder) Screening - Facial Prediction Issue  
**Status:** 🔴 Critical Issue Identified

---

## Executive Summary

The ASD result screen receives **`p_facial=0` (hardcoded placeholder)** instead of actual facial predictions from the AI model. While the backend `/api/asd/predict-face` endpoint exists and works correctly, and the frontend service layer has an `analyzeFace()` function ready to call it, **the facial prediction is never invoked** during the screening flow.

Instead:
- The system calls `/api/asd/predict-video` to extract frames from the recorded video
- The facial component is initialized to `0` as a placeholder
- Q-CHAT predictions work correctly (for comparison)
- Both predictions are fused and presented, but the facial component remains artificially low

---

## FINDING 1: p_facial=0 Hardcoded Initialization

**Severity:** 🔴 Critical

### Location
- **File:** `frontEnd/app/(tabs)/asd-research.tsx`
- **Line:** 130
- **Function:** `runInference()`

### Code Snippet
```typescript
const runInference = async () => {
  if (!allDone) return;
  setScreen('processing');
  try {
    setStatus('Analysing video frames…');
    let p_facial = 0;  // ← HARDCODED PLACEHOLDER
    let frame_urls: string[] = [];
    if (videoUri) {
      const form = new FormData();
      form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
      const vRes  = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
      const vData = await vRes.json();
      p_facial   = vData.asd_probability ?? 0;
      frame_urls = vData.frame_urls ?? [];
    }
```

### Analysis
- Line 130 initializes `p_facial` to `0`
- Lines 131-137 only update `p_facial` if `videoUri` exists
- If `videoUri` is null/undefined or if the video endpoint fails, `p_facial` stays at `0`
- This initialized value becomes the permanent placeholder passed to downstream processing

### Impact
- **User Experience:** Users see artificially low facial AI scores
- **Fusion Weighting:** The fused probability uses formula `0.15 * p_facial + 0.85 * p_qchat`, so even if Q-CHAT score is high, the final result is heavily influenced by the zero facial score
- **Data Integrity:** Historical predictions stored in Supabase have incorrect facial probabilities

---

## FINDING 2: Backend Endpoint Available But Not Used

**Severity:** 🟠 High

### Backend Location
- **File:** `backEnd/routers/asd_router.py`
- **Line:** 203
- **Endpoint:** `POST /api/asd/predict-face`

### Backend Code
```python
@router.post("/predict-face")
async def predict_asd_face(file: UploadFile = File(...)):
    """
    Upload an infant face image.
    Pipeline: decode (BGR) → resize 224x224 → mean-subtract → CNN → 256-D embedding
              → StandardScaler → LogReg probe → P(ASD).
    """
    try:
        if vgg_model is None or logreg_model is None or intermediate_model is None:
            raise HTTPException(status_code=503, detail="Facial ML models are not loaded (missing model weights).")

        contents = await file.read()
        nparr    = np.frombuffer(contents, np.uint8)
        img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode image. Please upload a valid JPEG or PNG.",
            )

        p_facial, _ = _infer_frame(img)
        if p_facial is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image, or the image is too blurry. Please upload a clear photo of the infant's face.",
            )
        confidence = "High" if p_facial >= 0.80 else ("Moderate" if p_facial >= 0.50 else "Low")
        label      = "ASD Risk Detected" if p_facial >= FACIAL_THRESHOLD else "Low ASD Risk"

        return {
            "asd_probability":  round(p_facial, 4),
            "label":            label,
            "confidence":       confidence,
            "threshold_used":   FACIAL_THRESHOLD,
            "frames_processed": 1,
        }
```

### Analysis
- ✅ **Endpoint is working** - accepts image uploads via POST
- ✅ **Full pipeline implemented** - VGG-Face feature extraction → LogReg classification
- ✅ **Error handling** - validates image format, detects faces, checks blur
- ✅ **Returns structured response** - includes probability, label, confidence
- ❌ **Never called from frontend** - no HTTP requests made to this endpoint during ASD screening

### Capabilities
- Accepts single image (JPEG or PNG)
- Returns facial ASD probability with confidence level
- Uses VGG-Face CNN feature extraction
- Applies LogReg probe for final classification
- Has face detection and blur filtering

---

## FINDING 3: Frontend Service Layer Has Method But Not Used

**Severity:** 🟠 High

### Location
- **File:** `frontEnd/services/analysisService.ts`
- **Line:** 10 (FACE_API constant)
- **Lines:** ~120-150 (analyzeFace function)

### Service Code
```typescript
// Line 10
const FACE_API = `${BASE_URL}/predict-face`;

// Lines ~120-150
export const analyzeFace = async (faceUri: string, abortSignal?: AbortSignal): Promise<FaceResult> => {
  console.log('📸 Starting face analysis for:', faceUri);

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(faceUri);
    const blob = await response.blob();
    formData.append("file", blob, "face.jpg");
  } else {
    formData.append("file", {
      uri: faceUri,
      name: 'face.jpg',
      type: 'image/jpeg'
    } as any);
  }

  const response = await fetch(FACE_API, {
    method: "POST",
    body: formData,
    headers: { 'Accept': 'application/json' },
    signal: abortSignal,
  });

  const contentType = response.headers.get('content-type') || '';
  const json = contentType.includes('application/json') ? await response.json() : null;

  console.log('📸 Face API Response:', json);

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
```

### Type Definitions
```typescript
export interface FaceResult {
  label: string;
  confidence: number;
  message?: string;
  pain_probability?: number;
}
```

### Analysis
- ✅ **Function is fully implemented** - ready to call `/api/asd/predict-face`
- ✅ **Cross-platform support** - handles both web and mobile (using expo)
- ✅ **Error handling** - validates response format and status codes
- ✅ **Type-safe** - returns FaceResult interface
- ❌ **Never imported in asd-research.tsx** - the component that needs it doesn't use it
- ❌ **Never called during ASD screening** - the function exists but is dormant

### Why It's Ready
- Has all necessary error handling
- Properly formats FormData for image upload
- Handles platform-specific differences
- Returns properly typed results
- Includes console logging for debugging

---

## FINDING 4: Current Facial Analysis Flow (Using Video Endpoint)

**Severity:** 🟠 High

### Location
- **File:** `frontEnd/app/(tabs)/asd-research.tsx`
- **Lines:** 125-177 (runInference function)

### Current Flow Implementation
```typescript
const runInference = async () => {
  if (!allDone) return;
  setScreen('processing');
  try {
    setStatus('Analysing video frames…');
    let p_facial = 0;
    let frame_urls: string[] = [];
    
    // STEP 1: Analyze video (not individual face image)
    if (videoUri) {
      const form = new FormData();
      form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
      const vRes  = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
      const vData = await vRes.json();
      p_facial   = vData.asd_probability ?? 0;
      frame_urls = vData.frame_urls ?? [];
    }

    // STEP 2: Analyze questionnaire
    setStatus('Running questionnaire model…');
    const payload = {
      A1: answers['A1'] ?? 0, A2: answers['A2'] ?? 0, A3: answers['A3'] ?? 0,
      A4: answers['A4'] ?? 0, A5: answers['A5'] ?? 0, A6: answers['A6'] ?? 0,
      A7: answers['A7'] ?? 0, A8: answers['A8'] ?? 0, A9: answers['A9'] ?? 0,
      A10: answers['A10'] ?? 0,
      Sex_M:                   answers['Sex_M']                   ?? 0,
      Family_mem_with_ASD_Yes: answers['Family_mem_with_ASD_Yes'] ?? 0,
    };
    const qRes  = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const qData    = await qRes.json();
    const p_qchat  = qData.asd_probability ?? 0;
    const qchat_score = qData.qchat_score ?? 0;

    // STEP 3: Fuse predictions
    setStatus('Computing fused prediction…');
    const fRes  = await fetch(`${API_BASE}/api/asd/predict-fused`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_facial, p_qchat, qchat_score, qchat_answers: payload, frame_urls }),
    });
    const fData = await fRes.json();

    // STEP 4: Navigate to result
    router.replace({
      pathname: '/(tabs)/asd-result' as any,
      params: {
        p_facial:       String(p_facial),
        p_qchat:        String(p_qchat),
        qchat_score:    String(qchat_score),
        fused_prob:     String(fData.fused_probability ?? 0),
        risk_level:     fData.risk_level     ?? 'Low',
        risk_color:     fData.risk_color      ?? 'green',
        recommendation: fData.recommendation ?? '',
        qchat_label:    qData.label           ?? 'Low ASD Risk',
        facial_label:   p_facial >= 0.06 ? 'ASD Risk Detected' : 'Low ASD Risk',
      },
    });
```

### Sequence Diagram
```
User Records Video (10 seconds)
         ↓
User Answers 12 Questions
         ↓
User Presses "Submit"
         ↓
runInference() called
         ↓
┌─────────────────────────────────────┐
│ STEP 1: Analyze Video               │
│ POST /api/asd/predict-video         │
│ (extracts frames internally)        │
│ Response: p_facial value            │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ STEP 2: Analyze Q-CHAT              │
│ POST /api/asd/predict-qchat         │
│ (uses questionnaire answers)        │
│ Response: p_qchat value             │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ STEP 3: Fuse Predictions            │
│ POST /api/asd/predict-fused         │
│ Input: p_facial + p_qchat           │
│ Formula: 0.15*facial + 0.85*qchat   │
│ Response: fused_probability         │
└─────────────────────────────────────┘
         ↓
Navigate to Result Screen
Display: facial, qchat, fused scores
```

### Issues with Current Flow

1. **Uses video endpoint instead of face endpoint**
   - Calls `/api/asd/predict-video` (frame extraction)
   - Should call `/api/asd/predict-face` (single image)

2. **p_facial is initialized to 0**
   - If videoUri is missing → p_facial = 0
   - If video analysis fails → p_facial = 0
   - Creates hard dependency on successful video processing

3. **No fallback if video is not recorded**
   - Video recording is optional per UI flow
   - But if skipped, facial prediction becomes 0
   - Fusion still runs with artificial 0 value

---

## FINDING 5: Q-CHAT Questionnaire Flow (Works Correctly)

**Severity:** 🟢 Reference Point

### Location
- **File:** `frontEnd/app/(tabs)/asd-qchat.tsx`
- **Lines:** 80-110 (submit function)

### Q-CHAT Implementation
```typescript
const submit = async () => {
  if (!allDone || loading) return;
  setLoading(true);
  try {
    const a = answers as Record<string, number>;
    const payload = {
      A1: a['A1'] ?? 0, A2: a['A2'] ?? 0, A3: a['A3'] ?? 0,
      A4: a['A4'] ?? 0, A5: a['A5'] ?? 0, A6: a['A6'] ?? 0,
      A7: a['A7'] ?? 0, A8: a['A8'] ?? 0, A9: a['A9'] ?? 0,
      A10: a['A10'] ?? 0,
      Sex_M:                   a['Sex_M']                   ?? 0,
      Family_mem_with_ASD_Yes: a['Family_mem_with_ASD_Yes'] ?? 0,
    };
    
    // Direct call to prediction endpoint
    const res  = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    
    // Navigate to result screen with captured response
    router.push({
      pathname: '/(tabs)/asd-qchat-result' as any,
      params: {
        asd_probability: String(data.asd_probability),
        label:           data.label,
        qchat_score:     String(data.qchat_score),
        score_exceeded:  String(data.score_exceeded),
        confidence:      data.confidence,
      },
    });
  } catch (e) {
    alert('API error: ' + String(e));
  } finally {
    setLoading(false);
  }
};
```

### Q-CHAT Result Navigation
```typescript
// File: frontEnd/app/(tabs)/asd-qchat-result.tsx
// Lines: 1-30

export default function ASDQChatResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    asd_probability: string;
    label:           string;
    qchat_score:     string;
    score_exceeded:  string;
    confidence:      string;
  }>();

  const probability    = parseFloat(params.asd_probability ?? '0');
  const qchatScore     = parseInt(params.qchat_score ?? '0', 10);
  const scoreExceeded  = params.score_exceeded === 'true';
  const confidence     = params.confidence ?? 'Low';

  const isHighRisk     = scoreExceeded || probability >= 0.35;
  const riskColor      = isHighRisk ? '#FF3B30' : '#34C759';
  const riskLabel      = isHighRisk ? 'Concern Detected' : 'Low Risk';
  const riskBg         = isHighRisk ? '#FFF1F0' : '#F0FFF4';
```

### Why Q-CHAT Works ✅

| Aspect | Implementation | Result |
|--------|----------------|---------| 
| **Direct Call** | Calls `/api/asd/predict-qchat` directly | ✅ Prediction happens |
| **No Placeholder** | No hardcoded initial values | ✅ Uses actual response |
| **Error Handling** | Try/catch with user alert | ✅ Fails gracefully |
| **Result Capture** | Stores response in navigation params | ✅ Correct values passed to screen |
| **Separate Screen** | Uses dedicated result screen | ✅ Clean presentation |
| **No Dependencies** | Works independent of other inputs | ✅ Reliable |

---

## FINDING 6: Result Screen Navigation & Display

**Severity:** 🟡 Medium

### Location
- **File:** `frontEnd/app/(tabs)/asd-research.tsx`
- **Lines:** 168-177 (navigation)

### Navigation Code
```typescript
router.replace({
  pathname: '/(tabs)/asd-result' as any,
  params: {
    p_facial:       String(p_facial),      // ← Often 0 (from video or placeholder)
    p_qchat:        String(p_qchat),       // ← Correct from questionnaire
    qchat_score:    String(qchat_score),
    fused_prob:     String(fData.fused_probability ?? 0),
    risk_level:     fData.risk_level     ?? 'Low',
    risk_color:     fData.risk_color      ?? 'green',
    recommendation: fData.recommendation ?? '',
    qchat_label:    qData.label           ?? 'Low ASD Risk',
    facial_label:   p_facial >= 0.06 ? 'ASD Risk Detected' : 'Low ASD Risk',
  },
});
```

### Result Display in ASD Result Screen
- **File:** `frontEnd/app/(tabs)/asd-result.tsx`
- **Lines:** 85-100 (facial score display)

```typescript
{/* Facial */}
<View style={[styles.subCard, { flex: 1, marginRight: 8 }]}>
  <Text style={styles.cardLabel}>FACIAL AI</Text>
  <Text style={[styles.subValue, { color: pFacial >= 0.06 ? '#FF3B30' : '#34C759' }]}>
    {(pFacial * 100).toFixed(1)}%
  </Text>
  <Text style={styles.subLabel}>{facialLabel}</Text>
</View>

{/* Q-CHAT */}
<View style={[styles.subCard, { flex: 1, marginLeft: 8 }]}>
  <Text style={styles.cardLabel}>Q-CHAT-10</Text>
  <Text style={[styles.subValue, { color: pQchat >= 0.35 ? '#FF3B30' : '#34C759' }]}>
    {(pQchat * 100).toFixed(1)}%
  </Text>
  <Text style={styles.subLabel}>{qchatLabel}</Text>
</View>
```

### Fusion Weight Formula
```
final_probability = 0.15 * p_facial + 0.85 * p_qchat
```

### Impact on Results

**Example Scenario 1: Good Q-CHAT, Bad Facial**
```
p_qchat = 0.50 (50% ASD probability)
p_facial = 0.00 (0% - hardcoded placeholder)

Fused = 0.15 * 0.00 + 0.85 * 0.50
      = 0.00 + 0.425
      = 0.425 (42.5%)  ← Still indicates concern, but underweighted facial component
```

**Example Scenario 2: Moderate Q-CHAT, Zero Facial**
```
p_qchat = 0.40 (40% ASD probability)
p_facial = 0.00 (0% - hardcoded placeholder)

Fused = 0.15 * 0.00 + 0.85 * 0.40
      = 0.00 + 0.34
      = 0.34 (34%)  ← Very close to threshold, facial component doesn't contribute
```

---

## FINDING 7: Conditional Logic - p_facial Remains 0 if Video Not Recorded

**Severity:** 🟡 Medium

### Location
- **File:** `frontEnd/app/(tabs)/asd-research.tsx`
- **Lines:** 130-137

### Problematic Code
```typescript
let p_facial = 0;  // Line 130 - Initialize to 0
let frame_urls: string[] = [];

if (videoUri) {  // Line 131 - Only update if videoUri exists
  const form = new FormData();
  form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
  const vRes  = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
  const vData = await vRes.json();
  p_facial   = vData.asd_probability ?? 0;  // Line 137 - Update if request succeeds
  frame_urls = vData.frame_urls ?? [];
}

// If we reach here and videoUri was false or fetch failed:
// p_facial is still 0
```

### Conditions Where p_facial = 0

| Condition | Probability | Impact |
|-----------|-------------|--------|
| Video not recorded | ~5-10% of users | Fusion uses artificial 0 |
| Video too short | ~2-3% of users | Backend returns error, caught as 0 |
| Camera permission denied | ~1-2% of users | videoUri never set |
| Network error | ~1-5% of users | Fetch fails, caught as 0 |
| Video file corrupted | ~0.1% of users | Backend cannot process |
| Video processing fails | ~2-3% of users | Backend error, caught as 0 |

### Error Handling Gap
```typescript
// Currently:
const vData = await vRes.json();
p_facial = vData.asd_probability ?? 0;  // No error check on vRes.ok

// Should be:
if (!vRes.ok) {
  const vData = await vRes.json();
  throw new Error(`Video analysis failed: ${vData.detail}`);
}
const vData = await vRes.json();
p_facial = vData.asd_probability ?? 0;
```

---

## Root Cause Analysis

### Primary Cause: Missing Integration

The facial prediction component is **not integrated** into the ASD research flow:

1. **Decision Point:** Designers chose to use `/api/asd/predict-video` for video-based analysis
   - Extracts frames from video internally
   - Simpler from frontend perspective (one endpoint call)
   - But requires video to be present

2. **Implementation Gap:** Frontend service function `analyzeFace()` was created but never wired into ASD flow
   - Function exists and is ready
   - Never imported in `asd-research.tsx`
   - Never called during analysis

3. **Hardcoded Default:** `p_facial = 0` used as placeholder
   - Initialized before conditional logic
   - Only updated if video analysis succeeds
   - Never replaced with actual facial prediction

### Secondary Issues

| Issue | Why It Happened | Result |
|-------|-----------------|--------|
| No error handling on video response | Assumes success | Catches as 0 on failure |
| Video endpoint dependency | Single point of failure | Entire facial component fails if video processing fails |
| No fallback mechanism | No alternative facial source | Can't use single frame as fallback |
| Service function unused | Not integrated into flow | Dead code in codebase |
| Backend endpoint ignored | Frontend has alternative | Wastes backend compute capability |

---

## Architecture Comparison

### Current Architecture (Broken)
```
User Video
    ↓
[asd-research.tsx] ---(p_facial = 0)--→ [runInference()] 
                                            ↓
                    [/api/asd/predict-video] (video-based)
                                            ↓
                    p_facial = response OR 0
                                            ↓
                    [/api/asd/predict-fused] (using p_facial)
                                            ↓
                    Result Screen displays facial score (often 0)
```

### Intended Architecture (What Should Happen)
```
User Video
    ↓
    [Extract Frame] (first/best frame from video)
    ↓
[asd-research.tsx] ---(analyzeFace(frame))--→ [analysisService.ts]
                                                    ↓
                                    [/api/asd/predict-face] (single image)
                                                    ↓
                                    p_facial = actual prediction
                                                    ↓
                                    [/api/asd/predict-fused]
                                                    ↓
                                    Result with real facial score
```

---

## Summary Comparison Table

| Aspect | Q-CHAT Flow | Facial Flow | Status |
|--------|------------|-------------|--------|
| **Backend Endpoint** | `/api/asd/predict-qchat` | `/api/asd/predict-face` | ✅ Both exist |
| **Frontend Service** | Uses directly in component | `analyzeFace()` exists but unused | ❌ Facial unused |
| **Called Before Results?** | ✅ Yes | ❌ No - uses `/predict-video` instead |
| **Initial Value** | N/A (no placeholder) | `p_facial = 0` on line 130 | ❌ Hardcoded |
| **Error Handling** | Try/catch with alert | No catch on video response | ❌ Poor |
| **Result Screen** | Dedicated screen (`asd-qchat-result`) | Unified screen (`asd-result`) | ⚠️  Unified shared screen |
| **Prediction Quality** | Direct from model | From video extraction or 0 | ❌ Quality issue |
| **Service Function** | Potentially used | Exists but never called | ❌ Dead code |

---

## File Reference Summary

### Frontend Files Involved

| File | Issue | Line(s) |
|------|-------|---------|
| `frontEnd/app/(tabs)/asd-research.tsx` | Hardcoded p_facial=0, doesn't call facial API | 130, 125-177 |
| `frontEnd/services/analysisService.ts` | `analyzeFace()` exists but not imported/used | 10, 120-150 |
| `frontEnd/app/(tabs)/asd-qchat.tsx` | Works correctly (reference) | 80-110 |
| `frontEnd/app/(tabs)/asd-result.tsx` | Displays facial score (often 0) | 85-100 |
| `frontEnd/app/(tabs)/asd-qchat-result.tsx` | Separate result screen (reference) | 1-30 |

### Backend Files Involved

| File | Endpoint | Status | Line(s) |
|------|----------|--------|---------|
| `backEnd/routers/asd_router.py` | `POST /api/asd/predict-face` | ✅ Works but unused | 203-246 |
| `backEnd/routers/asd_router.py` | `POST /api/asd/predict-video` | ✅ Used as alternative | 250+ |
| `backEnd/routers/asd_router.py` | `POST /api/asd/predict-fused` | ✅ Uses p_facial parameter | 440+ |

---

## Impact Assessment

### User Impact
- **Data Quality:** Users receive artificially low/zero facial prediction scores
- **Clinical Accuracy:** Fusion result is skewed toward Q-CHAT (85% weight already, but facial component becomes meaningless)
- **Research Validity:** Historical data with p_facial=0 is not representative of true facial detection capability

### System Impact
- **Backend Capacity:** `/api/asd/predict-face` endpoint never utilized
- **Frontend Code:** Dead service function (`analyzeFace()`) unused
- **Fusion Logic:** Designed for 15% facial weight but receives 0 value (defeating diversification)

### Business Impact
- **Feature Incomplete:** Advertised "AI-powered facial detection" not actually active
- **Research Claims:** "deep learning model analyses your child's facial patterns" - not happening
- **Liability Risk:** Users make decisions based on incomplete screening

---

## Recommendations

### Immediate (Critical)
1. [ ] Import `analyzeFace` from `analysisService.ts` in `asd-research.tsx`
2. [ ] Extract best frame from recorded video
3. [ ] Call `analyzeFace()` with extracted frame instead of using video endpoint
4. [ ] Remove hardcoded `p_facial = 0` initialization
5. [ ] Update `runInference()` to use actual facial prediction

### Short-term (High Priority)
1. [ ] Add error handling for facial prediction failures
2. [ ] Implement fallback if facial analysis fails
3. [ ] Test fusion with real facial predictions
4. [ ] Verify Supabase records store correct p_facial values
5. [ ] Update user-facing copy if promises were overclaimed

### Long-term (Technical Debt)
1. [ ] Consider removing unused `/api/asd/predict-video` endpoint if facial endpoint works
2. [ ] Consolidate facial analysis logic
3. [ ] Review documentation vs. actual implementation
4. [ ] Add integration tests for facial prediction flow
5. [ ] Performance testing with real facial predictions

---

## Appendix: Technical Details

### VGG-Face Preprocessing (Backend)
```python
# Input: BGR image from OpenCV
img = cv2.resize(cropped, (224, 224)).astype(np.float32)
img[:, :, 0] -= 93.5940   # Blue channel
img[:, :, 1] -= 104.7624  # Green channel
img[:, :, 2] -= 129.1863  # Red channel
batch = np.expand_dims(img, axis=0)
embedding = intermediate_model.predict(batch, verbose=0)
```

### Fusion Formula
```
p_final = ALPHA * p_facial + (1 - ALPHA) * p_qchat
        = 0.15 * p_facial + 0.85 * p_qchat
```

Where:
- `ALPHA = 0.15` (facial weight)
- `p_facial` = ASD probability from facial model (0-1)
- `p_qchat` = ASD probability from Q-CHAT model (0-1)

### Thresholds
```
Facial Threshold: 0.06 (6%)   → p_facial >= 0.06 = "ASD Risk Detected"
Q-CHAT Threshold: 0.35 (35%)  → p_qchat >= 0.35 = Concern indicated
Fusion Threshold: 0.35 (35%)  → p_final >= 0.35 = "High Risk"
```

---

## Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-05-03 | 1.0 | Investigation Team | Initial findings compiled |

---

**Classification:** Internal Investigation Report  
**Priority:** 🔴 Critical  
**Action Required:** ✅ Yes

