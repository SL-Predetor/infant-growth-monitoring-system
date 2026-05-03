# Fix: Video Upload 422 Error

## Problem

FormData construction in Expo is not converting video URI to proper blob. Backend rejects with 422.

## Solution

Convert video URI to blob BEFORE appending to FormData.

---

## File: `frontEnd/app/(tabs)/asd-research.tsx`

### Find (lines ~140-150, first FormData construction)

```typescript
// Call ASD-specific facial prediction endpoint
const form = new FormData();
form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);

const facialRes = await fetch(`${API_BASE}/api/asd/predict-face`, {
  method: 'POST',
  body: form,
});
```

### Replace With

```typescript
// Call ASD-specific facial prediction endpoint
// Convert video URI to blob first
const videoResponse = await fetch(videoUri);
const videoBlob = await videoResponse.blob();

const form = new FormData();
form.append('file', videoBlob, 'asd_video.mp4');

const facialRes = await fetch(`${API_BASE}/api/asd/predict-face`, {
  method: 'POST',
  body: form,
});
```

---

## Also Find (lines ~157-162, second FormData for frame extraction)

```typescript
const form = new FormData();
form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
const vRes = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
```

### Replace With

```typescript
// Convert video URI to blob
const videoResponse2 = await fetch(videoUri);
const videoBlob2 = await videoResponse2.blob();

const form = new FormData();
form.append('file', videoBlob2, 'asd_video.mp4');
const vRes = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
```

---

## Expected Result

After fix:
- ✅ Video URI converted to blob
- ✅ FormData accepts blob properly
- ✅ Backend receives valid file (200 OK)
- ✅ Facial prediction returns real probability

---

## That's it - two FormData constructions fixed.
