# Plan — "Check your email" post-signup flow

> **Purpose:** wire up a dedicated confirmation-pending screen so the app behaves correctly when Supabase's "Confirm email" setting is ON. Today, sign-up unconditionally pushes users to `/(auth)/add-infant`, which then renders "Not signed in" because `data.session` is `null` until the email is confirmed.

## Agent task list (execute in order)

1. Edit [frontEnd/lib/auth-context.tsx](frontEnd/lib/auth-context.tsx) — change `signUpWithEmail` return type, add `resendConfirmation`, update default context + provider value.
2. Edit [frontEnd/app/(auth)/sign-up.tsx](frontEnd/app/(auth)/sign-up.tsx) — branch on `needsEmailConfirmation` in `handleSignUp`.
3. Create [frontEnd/app/(auth)/check-email.tsx](frontEnd/app/(auth)/check-email.tsx) — new screen as specified below.
4. Run `npx tsc --noEmit` from `frontEnd/` and paste output into PR/hand-off.
5. Smoke-test: flow with "Confirm email" ON → check-email screen; flow with "Confirm email" OFF → add-infant (no regression).

**Do not commit.** Do not touch `sign-in.tsx`, `_layout.tsx`, the backend, or Supabase dashboard settings. Do not add dependencies. All styling must use tokens from `@/constants/theme` — **no hardcoded hex**.

---

## Task 1 — `frontEnd/lib/auth-context.tsx`

### 1a. Replace the `AuthContextType` declaration (currently [lines 25-34](frontEnd/lib/auth-context.tsx#L25-L34))

**Before:**

```ts
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: AuthError }>;
  signInWithGoogle: () => Promise<{ error: AuthError }>;
  signOut: () => Promise<void>;
};
```

**After:**

```ts
type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: AuthError; needsEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: AuthError }>;
  resendConfirmation: (email: string) => Promise<{ error: AuthError }>;
  signOut: () => Promise<void>;
};
```

### 1b. Update the default context value (currently [lines 36-45](frontEnd/lib/auth-context.tsx#L36-L45))

**Before:**

```ts
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signInWithEmail: async () => ({ error: { message: 'Not initialized' } }),
  signUpWithEmail: async () => ({ error: { message: 'Not initialized' } }),
  signInWithGoogle: async () => ({ error: { message: 'Not initialized' } }),
  signOut: async () => {},
});
```

**After:**

```ts
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signInWithEmail: async () => ({ error: { message: 'Not initialized' } }),
  signUpWithEmail: async () => ({ error: { message: 'Not initialized' } }),
  signInWithGoogle: async () => ({ error: { message: 'Not initialized' } }),
  resendConfirmation: async () => ({ error: { message: 'Not initialized' } }),
  signOut: async () => {},
});
```

### 1c. Replace the `signUpWithEmail` implementation (currently [lines 94-101](frontEnd/lib/auth-context.tsx#L94-L101))

**Before:**

```ts
const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  return { error: error ? { message: error.message } : null };
};
```

**After:**

```ts
const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  const needsEmailConfirmation = !error && !data.session && !!data.user;
  return {
    error: error ? { message: error.message } : null,
    needsEmailConfirmation,
  };
};
```

> Note: `supabase.auth.signUp` resolves with `{ data: { user, session }, error }`. When Supabase "Confirm email" is ON, `session` is `null` but `user` is populated — that's the pending-confirmation signal. When OFF, `session` is populated immediately.

### 1d. Add `resendConfirmation` immediately above `signOut` (currently [line 107](frontEnd/lib/auth-context.tsx#L107))

Insert:

```ts
const resendConfirmation = async (email: string) => {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error ? { message: error.message } : null };
};
```

### 1e. Update the provider's `value` object (currently [lines 112-123](frontEnd/lib/auth-context.tsx#L112-L123))

Add `resendConfirmation` to the value, placed between `signInWithGoogle` and `signOut` so it matches the type order:

```ts
<AuthContext.Provider
  value={{
    user,
    session,
    profile,
    isLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resendConfirmation,
    signOut,
  }}
>
```

---

## Task 2 — `frontEnd/app/(auth)/sign-up.tsx`

### Replace `handleSignUp` (currently [lines 64-74](frontEnd/app/(auth)/sign-up.tsx#L64-L74))

**Before:**

```tsx
const handleSignUp = async () => {
  if (!validate()) return;
  setLoading(true);
  const { error } = await signUpWithEmail(email, password, fullName);
  if (error) {
    setErrors({ form: error.message || 'Failed to create account' });
  } else {
    router.replace('/(auth)/add-infant');
  }
  setLoading(false);
};
```

**After:**

```tsx
const handleSignUp = async () => {
  if (!validate()) return;
  setLoading(true);
  const { error, needsEmailConfirmation } = await signUpWithEmail(email, password, fullName);
  if (error) {
    setErrors({ form: error.message || 'Failed to create account' });
  } else if (needsEmailConfirmation) {
    router.replace({ pathname: '/(auth)/check-email', params: { email } });
  } else {
    router.replace('/(auth)/add-infant');
  }
  setLoading(false);
};
```

No other edits to `sign-up.tsx`. Do not change imports, styles, or Google handler.

---

## Task 3 — NEW FILE `frontEnd/app/(auth)/check-email.tsx`

Create this file verbatim. Style tokens only, no hardcoded hex. Mirrors the formCard / primaryButton / ghostButton / errorBanner / footerRow register from `sign-up.tsx`.

```tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const C = Colors.light;

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendConfirmation } = useAuth();

  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    const { error } = await resendConfirmation(email);
    if (error) {
      setErrorMessage(error.message || 'Failed to resend confirmation email');
    } else {
      setSuccessMessage('Confirmation email sent');
    }
    setResending(false);
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 3000);
  };

  const bodyText = email
    ? `We sent a confirmation link to ${email}. Click it to activate your account, then come back and sign in.`
    : 'We sent a confirmation link to your email. Click it to activate your account, then come back and sign in.';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(auth)/sign-up')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={C.primary} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Icon Badge */}
        <View style={styles.badgeWrap}>
          <View style={styles.iconBadge}>
            <Mail size={32} color={C.primary} strokeWidth={1.8} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>{bodyText}</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
          {successMessage && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {/* Primary: Go to Sign In */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(auth)/sign-in')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>

          {/* Secondary: Resend email */}
          <TouchableOpacity
            style={[styles.ghostButton, (resending || !email) && styles.disabledButton]}
            onPress={handleResend}
            disabled={resending || !email}
            activeOpacity={0.85}
          >
            {resending
              ? <ActivityIndicator color={C.primary} />
              : <Text style={styles.ghostButtonText}>Resend email</Text>
            }
          </TouchableOpacity>

          <Text style={styles.hint}>Didn't get it? Check your spam folder.</Text>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Wrong email? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
            <Text style={styles.footerLink}>Sign up again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backText: {
    color: C.primary,
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    marginLeft: 2,
  },

  // Icon Badge
  badgeWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: C.label,
    marginBottom: Spacing.md,
    letterSpacing: Typography.h1.letterSpacing,
    textAlign: 'center',
  },
  body: {
    fontSize: Typography.body.fontSize,
    color: C.labelTertiary,
    lineHeight: 22,
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    backgroundColor: C.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },

  // Banners
  errorBanner: {
    backgroundColor: C.dangerSoft,
    borderLeftWidth: 3,
    borderLeftColor: C.danger,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: C.danger,
    fontSize: Typography.bodySmall.fontSize,
  },
  successBanner: {
    backgroundColor: C.primarySoft,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  successText: {
    color: C.primary,
    fontSize: Typography.bodySmall.fontSize,
  },

  // Primary Button
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryButtonText: {
    color: C.card,
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
    letterSpacing: Typography.button.letterSpacing,
  },

  // Ghost Button
  ghostButton: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    backgroundColor: C.card,
  },
  ghostButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: C.primary,
  },
  disabledButton: {
    opacity: 0.55,
  },

  // Hint
  hint: {
    fontSize: Typography.caption.fontSize,
    color: C.labelTertiary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: Typography.body.fontSize,
    color: C.labelTertiary,
  },
  footerLink: {
    fontSize: Typography.body.fontSize,
    color: C.primary,
    fontWeight: '600',
  },
});
```

### Style notes for the executor

- Uses `C.card` (`#FFFFFF` in light) for the primary button text instead of a literal `#FFFFFF`. The existing `sign-up.tsx` uses `'#FFFFFF'` literally at [line 258](frontEnd/app/(auth)/sign-up.tsx#L258) and [line 436](frontEnd/app/(auth)/sign-up.tsx#L436); do **not** fix that here — the prompt forbids introducing hardcoded hex in this new file, but does not ask to refactor the old file. Just make sure the new file uses `C.card`.
- Success banner re-uses `primarySoft` bg + `primary` text per spec; there is no dedicated `successSoft` / `success` token pairing for banners elsewhere in the auth screens, so keep this convention.
- `Radius.full` is used for both buttons so the ghost button visually matches the primary's pill shape.
- `primarySoft` is the only soft/brand token that is rgba-based in the palette, so it composites correctly over `C.card`.

---

## Verification plan

After the edits land:

1. **TypeScript:**
   ```bash
   cd frontEnd
   npx tsc --noEmit
   ```
   Paste the full output into the PR / hand-off. Expect zero errors. If Expo Router complains about the `pathname` string literal, confirm it recognises the new route by listing `app/(auth)/` — the new `check-email.tsx` auto-registers.

2. **Happy path, "Confirm email" ON (Supabase default):**
   - Sign up with a fresh email.
   - Expect the app to land on `/(auth)/check-email` with the email interpolated into the body text.
   - Tap **Resend email** — expect inline success banner. Verify via Supabase dashboard → Authentication → Users → audit log that a resend event fired; or check the inbox.
   - Click the link in the email → Supabase sets `email_confirmed_at`. Return to the app → tap **Go to Sign In** → sign in works.

3. **Regression, "Confirm email" OFF:**
   - Temporarily disable "Confirm email" in the Supabase dashboard (**do not commit this change** — revert after the test).
   - Sign up with a fresh email → expect direct navigation to `/(auth)/add-infant` (the `session` is returned immediately, so `needsEmailConfirmation` is `false`).
   - Re-enable the setting after testing.

4. **Error path:**
   - On `/(auth)/check-email`, simulate a resend with an invalid email by manually navigating `router.push({ pathname: '/(auth)/check-email', params: { email: 'nonexistent@example.com' } })` and tapping Resend. Expect either success (Supabase silently accepts to avoid email enumeration) or an inline error banner. Either is acceptable.

5. **Token audit:**
   ```bash
   cd frontEnd
   npx grep -nE "#[0-9A-Fa-f]{3,8}" app/\(auth\)/check-email.tsx || true
   ```
   Expect zero matches.

---

## Notes for the executor

- **Do not** delete the existing `'#FFFFFF'` literal in `sign-up.tsx` — that is out of scope and part of the existing tier-4 UX cleanup (`frontEnd/UX_AUDIT.md`).
- **Do not** add `Stack.Screen` config to `_layout.tsx` for `check-email`. Expo Router picks up the file automatically and the out-of-scope list forbids editing `_layout.tsx` here.
- **Do not** touch `sign-in.tsx`. A follow-up prompt will wire up the "Email not confirmed" error path there.
- **Do not** alter the mocked `lib/auth-context.tsx` provider to short-circuit around the real Supabase call — the existing code calls `supabase.auth.signUp` directly even though CLAUDE.md §5.6 notes auth is "currently mocked." That note refers to the dev-stub user, not to the sign-up call path. Leave the real Supabase call in place.
- After all three file changes, stop. Do not run `git add` or commit.
