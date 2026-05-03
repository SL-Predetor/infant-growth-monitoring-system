# Session Summary: May 4, 2026 — ASD Background Inference & Result UX

## Objective
Three connected UX/visual fixes for the ASD screening flow:

1. **Refine `asd-result.tsx`** to match the rest of the app's "Digital Nursery" design system.
2. Add a **non-blocking modal** during the 10–30s ASD video inference so the user is not stuck staring at a loading screen.
3. Make the inference **survive navigation** — if the user leaves the ASD flow and comes back, the modal should re-appear with the current status, and once done, tapping the ASD tab should surface the result.

## What We Completed ✅

### 1. Result page visual refinement — DONE
**File:** `frontEnd/app/(tabs)/asd-result.tsx`

Rewrote the page to use the design system tokens from `@/constants/theme`:
- Background: `C.background` (warm `#FCFBFA`) instead of iOS `#F2F2F7`
- Soft teal CTA (`C.primary`) instead of black
- Lucide icons (`ChevronLeft`, `ShieldCheck`, `AlertTriangle`, `Stethoscope`, `Hospital`)
- `SafeAreaView` from `react-native-safe-area-context`
- Theme `Spacing`, `Radius`, `Shadows`, `Typography`
- Risk palette mapped to semantic theme colors:
  - `green` → `C.success` (sage)
  - `orange` → `C.warning` (amber)
  - `red` → `C.danger` (soft rose)
- Numbered step badges (instead of plain `1. 2. 3.` text) for the high-risk recommendation card
- Icon badges next to recommendation titles instead of inline emoji

User confirmed: "previous edits was perfect"

### 2. Global inference state machine — DONE
**File created:** `frontEnd/lib/asd-inference-context.tsx`

Created `AsdInferenceProvider` + `useAsdInference()` hook holding:
- `state`: `'idle' | 'running' | 'done' | 'error'`
- `status`: live progress text
- `resultParams`: ResultParams object passed to result screen
- `errorMsg`: failure reason

Methods:
- `start({ videoUri, answers })` — runs the full 3-endpoint pipeline:
  1. `POST /api/asd/predict-video` (with platform-aware blob/uri FormData handling)
  2. `POST /api/asd/predict-qchat` with the 12 answers
  3. `POST /api/asd/predict-fused` for the final score
- `retry()` — re-runs with the last input
- `clear()` — resets to idle

Wrapped at root in `frontEnd/app/_layout.tsx` (inside `AuthProvider`).

### 3. Reusable modal component — DONE
**File created:** `frontEnd/components/AsdInferenceModal.tsx`

Modal with three states:
- **Running**: animated dots + status text + description "10–30 seconds. You can keep this screen open or come back later — we'll let you know when it's ready."
- **Done**: green check icon + "Analysis Complete" + **"See Result →"** button (navigates to `/asd-result` with params, then calls `clear()`)
- **Error**: rose alert icon + error message + **Try Again** / **Cancel**

Hardware back press blocked on Android while running.

### 4. asd-research refactored — DONE
**File:** `frontEnd/app/(tabs)/asd-research.tsx`

Reduced by ~120 lines:
- Removed local `LoadingDots`, all inference state, and the entire `runInference` body
- Now just calls `startInference({ videoUri, answers })` from context
- Mounts `<AsdInferenceModal />` on both the video and questions screens
- Removed unused imports (`Modal`, `BackHandler`, `useNavigation`, `Animated`, `useRef`, `useEffect`, `CheckCircle2`, `AlertTriangle`, `API_BASE`)

### 5. Modal mounted on asd-screen — DONE
**File:** `frontEnd/app/(tabs)/asd-screen.tsx`

Added `<AsdInferenceModal />` at the root of the ASD tab landing page so the popup re-appears whenever the user taps the ASD tab while inference is running or done.

---

## What's Broken ❌ (User reported "didn't work")

From the screenshot:
1. **Tab bar still visible/tappable while modal is open.** The modal renders correctly inside the screen, but the bottom tab bar (rendered by the parent `Tabs` navigator in `frontEnd/app/(tabs)/_layout.tsx`) sits *above* the modal's overlay. The user can still tap Cry, Log, Home, ASD, Mom and navigate away.
2. **Loading dots animation appears stuck.** Only one of the four dots is visible in the screenshot. May or may not actually be a bug — could just be a frame-capture artifact, but worth verifying.
3. **Cross-screen modal display unverified.** Need to confirm the modal actually appears on `asd-screen.tsx` when the user navigates back during/after inference. The provider is global, the modal is mounted on both screens, but it hasn't been tested end-to-end.

---

## How to Finish 🔧

### Fix 1 — Tab bar overlap (PRIMARY ISSUE)

The standard React Native `<Modal>` doesn't render above the parent navigator's tab bar. Two viable approaches:

**Option A (recommended): Render modal at the root layout, not inside tab screens.**
- Move `<AsdInferenceModal />` mount out of `asd-research.tsx` and `asd-screen.tsx`.
- Mount it once in `frontEnd/app/_layout.tsx` *after* the `<Stack>` (as a sibling), so it's at the absolute root and overlays everything including the tab bar.
- Example:
  ```tsx
  return (
    <ThemeProvider ...>
      <Stack>...</Stack>
      <AsdInferenceModal />   {/* sibling — renders above tabs */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
  ```
- This is the cleanest fix. The modal is global and visible regardless of which tab the user is on.

**Option B: Use a custom absolute-positioned overlay instead of `<Modal>`.**
- Replace `<Modal>` with a `<View>` styled `position: absolute; top:0; left:0; right:0; bottom:0; zIndex: 9999`.
- Mount at the root layout (same as Option A) — must be a sibling of the navigator.
- Slightly more control over animation; more code.

**Option C: Hide the tab bar via `tabBarStyle: { display: 'none' }`.**
- This was attempted earlier (in a prior iteration) using `navigation.getParent().setOptions(...)`.
- Was removed when we went global because it only worked on the screen that called it.
- Could re-add it inside the modal component itself using a ref to the tab navigator, but Option A is simpler.

### Fix 2 — Verify loading dots animate

Open `frontEnd/components/AsdInferenceModal.tsx` lines 14–46. The `LoadingDots` component uses RN `Animated` with `Animated.loop` + `useNativeDriver: true`. Verify:
- That `useEffect` runs on web (it should).
- That the four dots' opacity/scale interpolate as expected.
- If broken on web only, the issue is likely `useNativeDriver: true` which silently no-ops some props on web. Try `useNativeDriver: Platform.OS !== 'web'`.

### Fix 3 — End-to-end verification checklist

After applying Fix 1, run through this:

- [ ] Start ASD video screening → modal appears → tab bar is *not* tappable
- [ ] While running, tap any tab (e.g., Home) → modal stays visible above the new screen
- [ ] When inference completes → modal flips to "Analysis Complete" with "See Result" button on whatever screen the user is on
- [ ] Tap "See Result" → navigates to `/asd-result` and modal closes (state cleared)
- [ ] Trigger an error (e.g., kill backend mid-inference) → modal shows error state with Try Again / Cancel
- [ ] Tap Cancel → modal closes, app is fully usable
- [ ] Tap Try Again → re-runs the pipeline with the same input

---

## Files Touched This Session

| File | Status |
|---|---|
| `frontEnd/app/(tabs)/asd-result.tsx` | ✅ Refined to design system |
| `frontEnd/lib/asd-inference-context.tsx` | ✅ Created (global provider) |
| `frontEnd/components/AsdInferenceModal.tsx` | ✅ Created (reusable modal) |
| `frontEnd/app/_layout.tsx` | ✅ Wrapped with `AsdInferenceProvider` |
| `frontEnd/app/(tabs)/asd-research.tsx` | ✅ Refactored to use context (kept; still mounts modal — see Fix 1) |
| `frontEnd/app/(tabs)/asd-screen.tsx` | ✅ Mounts modal (still needed?) — see Fix 1 |

After Fix 1: remove the `<AsdInferenceModal />` mounts from both `asd-research.tsx` and `asd-screen.tsx` and mount once in the root layout.

---

## Backend Context (Unchanged)

The backend pipeline at `backEnd/routers/asd_router.py`:
- `/api/asd/predict-video` — uploads cropped face frames to Supabase Storage bucket `asd-frames` (MD5-named) and returns `frame_urls[]` + `asd_probability`
- `/api/asd/predict-qchat` — returns `asd_probability` + `qchat_score` + `label`
- `/api/asd/predict-fused` — fuses with formula `0.15 × p_facial + 0.85 × p_qchat`, persists row to `asd_predictions` table

Supabase migration `supabase/migrations/002_asd_setup.sql` creates the `asd_predictions` table and the `asd-frames` storage bucket. Schema matches what the backend writes — but the migration may not have been applied to the live project (see prior session note about `facial_prob` column missing).

---

## Commit Status

Nothing committed yet. Suggested commit message after Fix 1:
```
feat: ASD inference modal survives navigation; result page refined to design system

- New AsdInferenceProvider hoists video → qchat → fused pipeline to global state
- AsdInferenceModal component with running/done/error states + "See Result" button
- Modal mounted at root layout — overlays tab bar, persists across screens
- asd-result.tsx refactored to use Digital Nursery theme tokens (warm bg, lucide icons, semantic risk colors)
```

---

**Status:** Foundation laid (3 of 3 architecture pieces done), but the modal does not overlay the tab bar. Apply **Fix 1 (Option A)** — move the `<AsdInferenceModal />` mount to `frontEnd/app/_layout.tsx` as a sibling of `<Stack>` — to complete the feature.
