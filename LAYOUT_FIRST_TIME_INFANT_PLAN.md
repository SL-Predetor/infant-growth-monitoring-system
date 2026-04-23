# Plan — Route first-time users to add-infant, returning users to tabs

> **Purpose.** The root layout currently sends every signed-in user to `/(tabs)` the moment a session exists. That breaks first-run onboarding: a newly-confirmed user lands on the Home tab with no infant profile, and every growth / ASD / postpartum screen has to guard against missing infant data forever after.
>
> This prompt teaches the layout to check `public.infants` for the current user and route accordingly:
> - `hasInfants === true` → `/(tabs)`
> - `hasInfants === false` → `/(auth)/add-infant`
> - `hasInfants === null` (loading) → render the splash, don't redirect yet (prevents flicker)
>
> **Depends on:** Prompts 1 & 2 already merged. No other dependencies.

## Agent task list (execute in order)

1. Edit [frontEnd/app/_layout.tsx](frontEnd/app/_layout.tsx) — add a `hasInfants` state, query Supabase when the session's user id changes, gate the redirect effect on it, and export a module-level `refreshHasInfants()` function.
2. Edit [frontEnd/app/(auth)/add-infant.tsx](frontEnd/app/(auth)/add-infant.tsx) — call `refreshHasInfants()` after a successful insert (both "Let's Go!" and "Skip for now" paths end at the same `router.replace('/(tabs)')`, so one call site covers both).
3. Run `cd frontEnd && npx tsc --noEmit`. Expect zero new errors.
4. Smoke-test per §Verification below.

**Do not touch** `sign-in.tsx`, `sign-up.tsx`, `check-email.tsx`, `auth-context.tsx`, or anything under `app/(tabs)/`. Do not create a new context or hook. Do not change the `infants` schema.

---

## Design decisions (read before editing)

- **Module-scoped refresh, not a new context.** We set a module-level `let _refresh: (() => void) | null = null` inside `_layout.tsx` and an exported `refreshHasInfants()` that calls it. This avoids adding another Context and matches the existing auth guard's style (a single `RootLayoutNav` component owns routing state).
- **Tri-state `hasInfants: boolean | null`.** `null` means "not checked yet / session just appeared." While `null`, the redirect effect must **not** fire — otherwise the user flickers `/(tabs)` → `/(auth)/add-infant` on cold start. Once the query resolves, `null` becomes `true` or `false`.
- **Single query, no subscription.** We don't `supabase.from('infants').on(...)` — the only way `hasInfants` flips from `false` to `true` in-app is via the add-infant screen, which calls `refreshHasInfants()` explicitly.
- **Fail-open to onboarding.** If the infants query errors (RLS misconfig, network flake), we set `hasInfants = false`. Better to send someone through add-infant a second time than to strand them on a broken home screen.
- **The existing `add-infant` exception stays.** Today the effect already allows `segments[1] === 'add-infant'` to stay on that route when signed in. We keep that carve-out so a user mid-form doesn't get yanked away.
- **Skip insert already happens.** [add-infant.tsx:104-146](frontEnd/app/(auth)/add-infant.tsx#L104-L146) — both "Let's Go!" and "Skip for now" call `handleSave()`, which inserts a row and then calls `router.replace('/(tabs)')`. So a single `refreshHasInfants()` placed right before that `router.replace` covers both paths. No branching on `isSkip` needed.

---

## Task 1 — `frontEnd/app/_layout.tsx`

### 1a. Add imports at the top of the file (after [line 12](frontEnd/app/_layout.tsx#L12))

Current imports (lines 1-12):

```ts
import 'react-native-get-random-values';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
```

Two changes:

- Extend the React import: `import { useCallback, useEffect, useState } from 'react';`
- Add the Supabase client import below the auth-context line:

```ts
import { supabase } from '@/lib/supabase';
```

### 1b. Add the module-level refresh hook (insert between the imports block and `SplashScreen.preventAutoHideAsync();` at [line 14](frontEnd/app/_layout.tsx#L14))

```ts
let _refreshHasInfants: (() => void) | null = null;

export function refreshHasInfants() {
  _refreshHasInfants?.();
}
```

This exported function is imported from `add-infant.tsx` in Task 2.

### 1c. Replace the `RootLayoutNav` body (currently [lines 16-37](frontEnd/app/_layout.tsx#L16-L37))

**Before:**

```tsx
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to sign-in if no session
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // Allow add-infant screen for new signups
      const onAddInfant = segments[1] === 'add-infant';
      if (!onAddInfant) {
        router.replace('/(tabs)');
      }
    }
  }, [session, isLoading, segments]);
```

**After:**

```tsx
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [hasInfants, setHasInfants] = useState<boolean | null>(null);

  const userId = session?.user?.id ?? null;

  const checkHasInfants = useCallback(async () => {
    if (!userId) {
      setHasInfants(null);
      return;
    }
    const { data, error } = await supabase
      .from('infants')
      .select('id')
      .eq('parent_id', userId)
      .limit(1);
    if (error) {
      console.warn('[layout] infants lookup failed', error.message);
      setHasInfants(false); // fail-open to onboarding
      return;
    }
    setHasInfants((data ?? []).length > 0);
  }, [userId]);

  useEffect(() => {
    _refreshHasInfants = checkHasInfants;
    return () => {
      if (_refreshHasInfants === checkHasInfants) _refreshHasInfants = null;
    };
  }, [checkHasInfants]);

  useEffect(() => {
    checkHasInfants();
  }, [checkHasInfants]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onAddInfant = inAuthGroup && segments[1] === 'add-infant';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/sign-in');
      return;
    }

    // Session exists — wait for the infants check before redirecting away.
    if (hasInfants === null) return;

    if (hasInfants) {
      // Returning user: bounce out of any auth screen (incl. add-infant) into tabs.
      if (inAuthGroup) router.replace('/(tabs)');
    } else {
      // First-time user: park them on add-infant until they create a profile.
      if (!onAddInfant) router.replace('/(auth)/add-infant');
    }
  }, [session, isLoading, segments, hasInfants]);
```

### 1d. Leave everything else alone

Do not change the `if (isLoading) return <ActivityIndicator .../>` block, the `<Stack>`, or the `RootLayout` default export. The `ActivityIndicator` currently uses a hardcoded `#6C63FF` — leave it; refactoring to a theme token is a separate cleanup item in CLAUDE.md §10.3.

---

## Task 2 — `frontEnd/app/(auth)/add-infant.tsx`

### 2a. Add the import at the top (after [line 17](frontEnd/app/(auth)/add-infant.tsx#L17))

Current import block (lines 1-19):

```ts
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const C = Colors.light;
```

Add one line directly below the supabase import:

```ts
import { refreshHasInfants } from '../_layout';
```

### 2b. Call `refreshHasInfants()` inside the success branch of `handleSave` (currently [lines 134-140](frontEnd/app/(auth)/add-infant.tsx#L134-L140))

**Before:**

```ts
const { error } = await supabase.from('infants').insert(payload);
if (error) {
  console.error('[add-infant] insert error', error);
  setErrors({ form: `${error.message}${error.hint ? ' — ' + error.hint : ''}` });
} else {
  router.replace('/(tabs)');
}
```

**After:**

```ts
const { error } = await supabase.from('infants').insert(payload);
if (error) {
  console.error('[add-infant] insert error', error);
  setErrors({ form: `${error.message}${error.hint ? ' — ' + error.hint : ''}` });
} else {
  refreshHasInfants();
  router.replace('/(tabs)');
}
```

No other edits in this file. Both "Let's Go!" (step 2 submit) and "Skip for now" reach this branch — one call site covers both.

---

## Acceptance

All of the following must pass before reporting done:

- [ ] `cd frontEnd && npx tsc --noEmit` shows **no new** errors attributable to `_layout.tsx` or `add-infant.tsx`. Pre-existing errors listed in the prior task's completion note (edit-profile.tsx, asd-research.tsx, growth-history.tsx, theme.ts) are out of scope.
- [ ] On a freshly-confirmed account (zero rows in `public.infants`), signing in lands on `/(auth)/add-infant` **without** a flash of `/(tabs)` first.
- [ ] Completing the add-infant form ("Let's Go!") routes to `/(tabs)`. Reloading the app keeps the user on `/(tabs)`.
- [ ] "Skip for now" (with step 1 validated) also routes to `/(tabs)` and sticks across reloads.
- [ ] For an account that already has ≥1 infant row, sign-out → sign-in lands on `/(tabs)` directly, never on add-infant.
- [ ] Signing out returns to `/(auth)/sign-in`.
- [ ] `useSegments()` shouldn't report `undefined` anywhere — the route-group carve-out (`segments[1] === 'add-infant'`) still works.
- [ ] No console warnings from `[layout] infants lookup failed` during the normal happy-path flows. (The log is still allowed to fire if you deliberately break RLS in testing — just not during normal smoke tests.)

---

## Out of scope (do NOT touch in this prompt)

- **The "skip for now" long-term UX.** Today it inserts a row with `name + dob + gender + gestational_age` and nulls out the step-2 fields. The product question of whether skip should instead mark the profile "onboarded" without creating a real infant is deferred — stick with the current behavior.
- The `#6C63FF` literal in the layout's loading spinner.
- Introducing a new auth context hook (`useHasInfants()`) — keep the module-level refresh.
- Any edits to `(tabs)/*` screens that already assume infant data exists.
- Adding realtime Supabase subscriptions.
- Migrating the `infants` schema to add a dedicated `onboarding_complete` column.

---

## Verification

After the edits land:

1. **TypeScript.**
   ```bash
   cd frontEnd
   npx tsc --noEmit
   ```
   Paste output into the PR / hand-off. Confirm only the pre-existing regressions remain.

2. **First-time signup (happy path).**
   - In Supabase dashboard: delete the last test account from `auth.users` (this also cascades `profiles` + `infants` via FKs). Or just sign up with a fresh email.
   - Confirm email → sign in → lands on `/(auth)/add-infant` with no visible flicker.
   - Fill step 1 + step 2 → tap "Let's Go!" → lands on `/(tabs)`.
   - Kill and relaunch the app (or `r` in Metro) → still on `/(tabs)`.

3. **Skip path.**
   - Fresh signup → confirm → sign in.
   - Fill step 1 only → tap "Skip for now" → lands on `/(tabs)`.
   - Verify in Supabase dashboard → Table editor → `infants` that a row exists with step-2 fields null.
   - Relaunch → still on `/(tabs)`.

4. **Returning user.**
   - Sign out from the Profile tab → redirected to `/(auth)/sign-in`.
   - Sign in with the same account → lands on `/(tabs)` directly.
   - Check Metro logs — no `[layout] infants lookup failed` warning.

5. **Edge: two accounts on the same device.**
   - Sign out account A.
   - Sign up account B (fresh email) → confirm → sign in.
   - Expected: account B lands on `/(auth)/add-infant` even though account A previously had infants. Confirms the query re-runs on `userId` change.

6. **Token audit on the two touched files.**
   ```bash
   cd frontEnd
   npx grep -nE "#[0-9A-Fa-f]{3,8}" app/_layout.tsx app/\(auth\)/add-infant.tsx || true
   ```
   Expect only the pre-existing `#6C63FF` (loading spinner) and `'#FFFFFF'` (primary button text) hits — no new ones.

---

## Notes for the executor

- **Don't export `refreshHasInfants` before defining it.** The `let _refreshHasInfants` declaration and the `export function refreshHasInfants()` wrapper both belong at module scope in `_layout.tsx`, above `RootLayoutNav`. Importing from `'../_layout'` inside `(auth)/add-infant.tsx` works because Expo Router does not treat `_layout.tsx` as special for ES-module imports — it's still a plain module.
- **Cleanup matters.** The `useEffect` that wires `_refreshHasInfants = checkHasInfants` must clear the pointer on unmount (and only if it still points to the current closure). Otherwise a hot-reload could leave a stale closure behind.
- **`session?.user?.id` vs `user?.id`.** Use `session?.user?.id` — the auth-context exposes both but `session` is the single source of truth for "am I logged in right now." Avoid a mismatched snapshot.
- Do not add an early-return loading screen for `hasInfants === null` inside `RootLayoutNav` — the existing `isLoading` loader covers the cold-start window, and for the in-flight infants query we simply don't call `router.replace`, which is enough to prevent flicker.
- Do not call `refreshHasInfants()` elsewhere (sign-in, sign-up, check-email) — the `userId` useEffect already re-queries when a new session arrives.
