import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function MomsRecoveryScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/recovery' as any);
  }, []);
  return null;
}
