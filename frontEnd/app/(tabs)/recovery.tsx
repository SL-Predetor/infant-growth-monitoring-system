import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// Re-use service helpers to keep network configuration consistent with the rest of the app
import {
  submitPostpartum,
  PostpartumPayload,
  PostpartumResult,
} from '@/services/postpartumService';

// copy of PredictionResponse type from postpartum-mobile
type PredictionResponse = {
  predictions?: {
    perineal?: { score: number; risk: string };
    csection?: { score: number; risk: string };
    back_pelvic?: { score: number; risk: string };
  };
  guidance?: {
    model_based?: string[];
    general_care?: string[];
  };
};

export default function RecoveryScreen() {
  const [formData, setFormData] = useState<any>({
    age: '',
    weeks_since_delivery: '',
    delivery_type: 'vaginal_no_tear',
    parenting_type: 'partner',
    pain_pattern: 'movement',
    healing_progress: 'same',
    sleep_hours: '6-7hrs',
    daytime_fatigue_score: 5,
    baby_sleep_pattern: '3-4hrs',
    meals_per_day: '3',
    protein_intake: 'adequate',
    iron_intake: 'daily',
    fluid_intake: '2-3L',
    fruit_veg_intake: '3+',
    physical_activity: '15-30mins',
    feeding_posture: 'upright',
    lifting_posture: 'neutral',
  });

  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: string, value: string | number) => {
    setFormData({ ...formData, [key]: value });
  };

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload: PostpartumPayload = {
        ...formData,
        age: Number(formData.age),
        weeks_since_delivery: Number(formData.weeks_since_delivery),
      } as any;

      const data = await submitPostpartum(payload);
      setResult(data as PredictionResponse);
    } catch (err) {
      console.error('Predict request failed:', err);
      setError('Unable to connect to backend – check API_URL configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Postpartum Pain Prediction</Text>
        <Text style={styles.section}>Mother Information</Text>

        <Text>Age</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.age}
          onChangeText={(v) => update('age', v)}
        />

        <Text>Weeks Since Delivery</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={formData.weeks_since_delivery}
          onChangeText={(v) => update('weeks_since_delivery', v)}
        />

        <Text>Delivery Type</Text>
        <Picker
          selectedValue={formData.delivery_type}
          onValueChange={(v) => update('delivery_type', v)}
        >
          <Picker.Item label="Vaginal (No Tear)" value="vaginal_no_tear" />
          <Picker.Item label="Vaginal (With Tear)" value="vaginal_tear" />
          <Picker.Item label="C-Section" value="csection" />
        </Picker>

        <Text>Parenting Support</Text>
        <Picker
          selectedValue={formData.parenting_type}
          onValueChange={(v) => update('parenting_type', v)}
        >
          <Picker.Item label="Partner" value="partner" />
          <Picker.Item label="Single" value="single" />
          <Picker.Item label="Family" value="family" />
        </Picker>

        <Text>Pain Pattern</Text>
        <Picker
          selectedValue={formData.pain_pattern}
          onValueChange={(v) => update('pain_pattern', v)}
        >
          <Picker.Item label="Movement" value="movement" />
          <Picker.Item label="Continuous" value="continuous" />
          <Picker.Item label="Sharp" value="sharp" />
          <Picker.Item label="Feeding" value="feeding" />
        </Picker>

        <Text>Healing Progress</Text>
        <Picker
          selectedValue={formData.healing_progress}
          onValueChange={(v) => update('healing_progress', v)}
        >
          <Picker.Item label="Improving" value="improving" />
          <Picker.Item label="Same" value="same" />
          <Picker.Item label="Worsening" value="worsening" />
        </Picker>

        <Text style={styles.section}>Sleep and Fatigue</Text>

        <Text>Sleep Duration</Text>
        <Picker
          selectedValue={formData.sleep_hours}
          onValueChange={(v) => update('sleep_hours', v)}
        >
          <Picker.Item label="<3 hrs" value="<3hrs" />
          <Picker.Item label="3-5 hrs" value="3-5hrs" />
          <Picker.Item label="6-7 hrs" value="6-7hrs" />
          <Picker.Item label=">7 hrs" value=">7hrs" />
        </Picker>

        <Text>Daytime Fatigue (0-10)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(formData.daytime_fatigue_score)}
          onChangeText={(v) => update('daytime_fatigue_score', Number(v))}
        />

        <Text>Baby Sleep Pattern</Text>
        <Picker
          selectedValue={formData.baby_sleep_pattern}
          onValueChange={(v) => update('baby_sleep_pattern', v)}
        >
          <Picker.Item label="Frequent waking" value="frequent" />
          <Picker.Item label="3-4 hrs" value="3-4hrs" />
          <Picker.Item label="5+ hrs" value="5+hrs" />
        </Picker>

        <Text style={styles.section}>Nutrition</Text>

        <Text>Meals Per Day</Text>
        <Picker
          selectedValue={formData.meals_per_day}
          onValueChange={(v) => update('meals_per_day', v)}
        >
          <Picker.Item label="2 meals" value="2" />
          <Picker.Item label="3 meals" value="3" />
          <Picker.Item label=">3 meals" value=">3" />
        </Picker>

        <Text>Protein Intake</Text>
        <Picker
          selectedValue={formData.protein_intake}
          onValueChange={(v) => update('protein_intake', v)}
        >
          <Picker.Item label="Rare" value="rare" />
          <Picker.Item label="Sometimes" value="sometimes" />
          <Picker.Item label="Adequate" value="adequate" />
          <Picker.Item label="High" value="high" />
        </Picker>

        <Text>Iron Intake</Text>
        <Picker
          selectedValue={formData.iron_intake}
          onValueChange={(v) => update('iron_intake', v)}
        >
          <Picker.Item label="Rare" value="rare" />
          <Picker.Item label="Sometimes" value="sometimes" />
          <Picker.Item label="Daily" value="daily" />
        </Picker>

        <Text>Fluid Intake</Text>
        <Picker
          selectedValue={formData.fluid_intake}
          onValueChange={(v) => update('fluid_intake', v)}
        >
          <Picker.Item label="<1 L" value="<1L" />
          <Picker.Item label="1-2 L" value="1-2L" />
          <Picker.Item label="2-3 L" value="2-3L" />
          <Picker.Item label=">3 L" value=">3L" />
        </Picker>

        <Text>Fruit and Vegetable Intake</Text>
        <Picker
          selectedValue={formData.fruit_veg_intake}
          onValueChange={(v) => update('fruit_veg_intake', v)}
        >
          <Picker.Item label="<1 serving" value="<1" />
          <Picker.Item label="1-2 servings" value="1-2times" />
          <Picker.Item label="3+ servings" value="3+" />
        </Picker>

        <Text style={styles.section}>Activity and Posture</Text>

        <Text>Physical Activity</Text>
        <Picker
          selectedValue={formData.physical_activity}
          onValueChange={(v) => update('physical_activity', v)}
        >
          <Picker.Item label="None" value="none" />
          <Picker.Item label="<15 mins" value="<15mins" />
          <Picker.Item label="15-30 mins" value="15-30mins" />
          <Picker.Item label=">30 mins" value=">30mins" />
        </Picker>

        <Text>Feeding Posture</Text>
        <Picker
          selectedValue={formData.feeding_posture}
          onValueChange={(v) => update('feeding_posture', v)}
        >
          <Picker.Item label="Upright" value="upright" />
          <Picker.Item label="Leaning" value="leaning" />
          <Picker.Item label="Lying" value="lying" />
          <Picker.Item label="Mixed" value="mixed" />
        </Picker>

        <Text>Lifting Posture</Text>
        <Picker
          selectedValue={formData.lifting_posture}
          onValueChange={(v) => update('lifting_posture', v)}
        >
          <Picker.Item label="Neutral" value="neutral" />
          <Picker.Item label="Hunched" value="hunched" />
          <Picker.Item label="Unsure" value="unsure" />
        </Picker>

        <Button
          title={loading ? 'Predicting...' : 'Predict Pain'}
          onPress={submit}
          disabled={loading}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {result?.predictions && (
          <View style={styles.result}>
            <Text style={styles.subTitle}>Prediction Results</Text>

            <Text>Perineal Pain: {result.predictions.perineal?.risk ?? 'N/A'}</Text>
            <Text>Cesarean Pain: {result.predictions.csection?.risk ?? 'N/A'}</Text>
            <Text>Pelvic-Back Pain: {result.predictions.back_pelvic?.risk ?? 'N/A'}</Text>

            <Text style={styles.subTitle}>Personalized Recovery Guidance</Text>
            {Array.isArray(result.guidance?.model_based) &&
              result.guidance.model_based.map((tip, index) => (
                <Text key={`${tip}-${index}`}>- {tip}</Text>
              ))}

            <Text style={styles.disclaimer}>
              This guidance supports recovery and does not replace medical advice.
            </Text>
          </View>
        )}

      </ScrollView>
    </ParallaxScrollView>
  );
}

// styles remain the same as index.tsx
const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  section: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
    borderRadius: 5,
  },
  error: { color: 'red', marginTop: 10 },
  result: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#eef',
    borderRadius: 5,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    color: '#555',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  content: {
    marginTop: 12,
  },
  headerImage: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

