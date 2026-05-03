# Agent Task: Fix Facial ASD Predictions (Complete)

## Pre-Task: Clean Up Documentation

**Before implementing fixes, delete these .md files:**
```
- FRONTEND_API_URL_FIX.md (✅ done, not needed)
- AGENT_PROMPT_FIX_API_URLS.md (✅ done, not needed)
- FACIAL_AI_FINDINGS.md (keep for reference, but outdated fix in it)
- AGENT_PROMPT_FIX_FACIAL_AI.md (❌ WRONG - used analyzeFace, not ASD endpoint)
- ASD_VALIDATION_PIPELINE.md (reference only, not needed)
```

**After cleanup, only keep:**
```
- CLAUDE.md (master reference)
- This file (AGENT_TASK_FIX_FACIAL_ASD.md)
- FACIAL_AI_FINDINGS.md (for analysis reference)
```

---

## The Real Problem (Corrected)

**Issue:** Frontend passes `p_facial=0` to result screen, even with video upload.

**Root Cause:** Previous fix used `analyzeFace()` which is for **Cry pain detection**, not **ASD detection**.

**Solution:** Call `/api/asd/predict-face` endpoint **directly** to get real ASD probabilities.

---

## File: `frontEnd/app/(tabs)/asd-research.tsx`

### Current Broken Code (What's There Now)

**Lines ~140-165 in `runInference()` function:**
```typescript
// Analyze facial features from video
if (videoUri) {
  try {
    // Extract first/best frame from video for facial analysis
    setStatus('Extracting video frame…');
    
    // Call facial prediction API
    const facialResult = await analyzeFace(videoUri);  // ← WRONG: Pain detection, not ASD
    
    // Extract probability from facial result
    if (facialResult.label === 'ASD Risk Detected') {  // ← Never matches (wrong endpoint)
      p_facial = 0.4;
    } else {
      p_facial = 0.1;
    }
    
    console.log('✅ Facial analysis complete:', facialResult);
  } catch (facialError) {
    console.warn('⚠️ Facial analysis failed, using fallback:', facialError);
    p_facial = 0;  // ← Falls back to 0
  }
  
  // Also get frame URLs from video endpoint...
}
```

### Correct Code (What Should Be There)

**Replace lines ~140-165 with:**
```typescript
// Analyze facial features from video
if (videoUri) {
  try {
    setStatus('Analysing facial features…');
    
    // Call ASD-specific facial prediction endpoint
    const form = new FormData();
    form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
    
    const facialRes = await fetch(`${API_BASE}/api/asd/predict-face`, {
      method: 'POST',
      body: form,
    });
    
    if (!facialRes.ok) {
      const errorData = await facialRes.json();
      throw new Error(`Facial analysis failed: ${errorData.detail || facialRes.statusText}`);
    }
    
    const facialData = await facialRes.json();
    p_facial = facialData.asd_probability ?? 0;  // ← Real ASD probability!
    
    console.log('✅ Facial analysis complete:', facialData);
  } catch (facialError) {
    console.warn('⚠️ Facial analysis failed, using fallback:', facialError);
    p_facial = 0;
  }
  
  // Also get frame URLs from video endpoint for storage
  try {
    setStatus('Extracting frame thumbnails…');
    const form = new FormData();
    form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
    const vRes = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
    const vData = await vRes.json();
    frame_urls = vData.frame_urls ?? [];
  } catch (videoError) {
    console.warn('⚠️ Frame extraction failed:', videoError);
    frame_urls = [];
  }
} else {
  console.warn('⚠️ No video recorded - facial prediction will be 0');
}
```

### Key Differences

| Aspect | Wrong Way (Previous) | Correct Way (New) |
|--------|----------------------|-------------------|
| **Endpoint** | `/predict-face` (Cry pain) | `/api/asd/predict-face` (ASD) |
| **Function** | `analyzeFace()` | Direct `fetch()` call |
| **Return Type** | `FaceResult { label, pain_probability }` | ASD response `{ asd_probability }` |
| **Probability** | Mapped to 0.1 or 0.4 | Real value from model |
| **Result** | `p_facial=0` (wrong) | `p_facial=0.39` (correct) |

---

## Implementation Checklist

**Find in asd-research.tsx:**
- [ ] Line ~130: `let p_facial = 0;` (initialization - keep)
- [ ] Lines ~140-165: Facial analysis logic (REPLACE ENTIRE BLOCK)
- [ ] Line ~196: `body: JSON.stringify({ p_facial, ...})` (keep - fusion uses it)

**Replace:**
- [ ] Remove `analyzeFace` import (line ~19) - no longer needed
- [ ] Remove facial analysis try/catch block
- [ ] Add new facial analysis code (see "Correct Code" above)

**Verify after:**
- [ ] No `analyzeFace` references remain in file
- [ ] Direct fetch to `/api/asd/predict-face` present
- [ ] Error handling wraps both facial + frame extraction
- [ ] `p_facial` receives real `asd_probability` from response

---

## Expected Result

**Before (Wrong):**
```
Video uploaded to backend
Backend returns: { asd_probability: 0.39, ... }
Frontend receives: ✅ Response OK
Frontend processes: analyzeFace() → label check → maps to 0.1 or 0.4
Result screen: p_facial=0.0% ❌ (wrong)
```

**After (Correct):**
```
Video uploaded to backend
Backend returns: { asd_probability: 0.39, ... }
Frontend receives: ✅ Response OK
Frontend processes: p_facial = 0.39 (direct assignment)
Result screen: p_facial=39.0% ✅ (correct)
```

---

## Testing After Fix

1. Open Expo: `npx expo start`
2. Go to ASD tab
3. Record 5-10 second video
4. Answer Q-CHAT (10 questions)
5. Press Submit
6. **Check result screen:**
   - Facial AI: **NOT 0.0%** (should be ~30-60%)
   - Q-CHAT: correct value
   - Fused: correctly calculated
   - Risk level: appropriate

7. **Check console for:**
   ```
   ✅ Facial analysis complete: { asd_probability: 0.39, ... }
   ```

---

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `asd-research.tsx` | Replace facial logic block | ~140-165 |

**That's it - one file, one block replacement.**

---

## Status

**Workload:** Fix Facial ASD Predictions (Corrected)
**Complexity:** Simple (1 function block replacement)
**Time:** 5-10 minutes
**Risk:** Low (isolated change)

---

## Summary

- ❌ **Previous approach:** Wrong endpoint (Cry pain), wrong return type, wrong mapping
- ✅ **Correct approach:** ASD-specific endpoint, real probability, correct fusion
- 🎯 **Result:** Facial predictions actually show on result screen

**Ready to execute.**
