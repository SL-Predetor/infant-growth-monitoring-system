import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function MomsRecoveryScreen() {
  const router = useRouter();
  useEffect(() => {
    // redirect to the actual recovery page (tabs group is implicit)
    router.replace('/recovery');
  }, []);
  return null;
}
