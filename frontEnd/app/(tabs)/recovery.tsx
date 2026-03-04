import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
//import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
//import ParallaxScrollView from '@/components/parallax-scroll-view';


import {
  submitPostpartum,
  PostpartumPayload,
} from '@/services/postpartumService';

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
    age: '28',
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

  //const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
 //const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const update = (key: string, value: string | number) => {
    setFormData({ ...formData, [key]: value });
  };
{/*
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
      setError('Unable to connect to backend – check API_URL configuration');
    } finally {
      setLoading(false);
    }
  };*/}

  const submit = async () => {
  try {
    setLoading(true);
    setError(null);

    const payload: PostpartumPayload = {
      ...formData,
      age: Number(formData.age),
      weeks_since_delivery: Number(formData.weeks_since_delivery),
    } as any;

    const data = await submitPostpartum(payload);

    router.push({
      pathname: '/mom-prediction-result',
      params: {
        result: JSON.stringify(data),
      },
    });

  } catch (err) {
    setError('Unable to connect to backend – check API_URL configuration');
  } finally {
    setLoading(false);
  }
};

  const getRiskColor = (risk?: string) => {
    if (risk === 'High') return '#FFEBEE';
    if (risk === 'Moderate') return '#FFF3E0';
    return '#E8F5E9';
  };

  return (
  <View style={{ flex: 1, backgroundColor: '#ebe9f6' }}>
    
    {/* Navigation Bar */}
    <View style={styles.navBar}>
      <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
        <Text style={styles.hamburger}>☰</Text>
      </TouchableOpacity>

      {menuVisible && (
        <View style={styles.menu}>
          {/*
          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              router.push('/postpartum-history');
            }}
          >
            
            <Text style={styles.menuItem}>History</Text>
          </TouchableOpacity>
*/}
          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              router.push('/postpartum-dashboard');
            }}
          >
            <Text style={styles.menuItem}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>

    {/* Scrollable Content */}
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Your Recovery Path</Text>
      <Text style={styles.headerSubtitle}>
        You’re doing your best. Let’s understand your recovery.
      </Text>

      

        {/* ---------------- Mother Info ---------------- */}
        <View style={styles.card1}>
          <Text style={styles.cardTitle}>👩 Mother Information</Text>

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.age}
            onChangeText={(v) => update('age', v)}
          />

          <Text style={styles.label}>Weeks Since Delivery</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={formData.weeks_since_delivery}
            onChangeText={(v) => update('weeks_since_delivery', v)}
          />

          <Text style={styles.label}>Delivery Type</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.delivery_type}
              onValueChange={(v) => update('delivery_type', v)}
            >
              <Picker.Item label="Vaginal (No Tear)" value="vaginal_no_tear" />
              <Picker.Item label="Vaginal (With Tear)" value="vaginal_tear" />
              <Picker.Item label="C-Section" value="csection" />
            </Picker>
          </View>
        </View>

        {/* ---------------- Pain Section ---------------- */}
        <View style={styles.card2}>
          <Text style={styles.cardTitle}>🩹 Pain & Healing</Text>

          <Text style={styles.label}>Pain Pattern</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.pain_pattern}
              onValueChange={(v) => update('pain_pattern', v)}
            >
              <Picker.Item label="Movement" value="movement" />
              <Picker.Item label="Continuous" value="continuous" />
              <Picker.Item label="Sharp" value="sharp" />
              <Picker.Item label="Feeding" value="feeding" />
            </Picker>
          </View>

          <Text style={styles.label}>Healing Progress</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.healing_progress}
              onValueChange={(v) => update('healing_progress', v)}
            >
              <Picker.Item label="Improving" value="improving" />
              <Picker.Item label="Same" value="same" />
              <Picker.Item label="Worsening" value="worsening" />
            </Picker>
          </View>
        </View>

        {/* ---------------- Sleep Section ---------------- */}
        <View style={styles.card3}>
          <Text style={styles.cardTitle}>😴 Sleep & Fatigue</Text>

          <Text style={styles.label}>Sleep Duration</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.sleep_hours}
              onValueChange={(v) => update('sleep_hours', v)}
            >
              <Picker.Item label="<3 hrs" value="<3hrs" />
              <Picker.Item label="3-5 hrs" value="3-5hrs" />
              <Picker.Item label="6-7 hrs" value="6-7hrs" />
              <Picker.Item label=">7 hrs" value=">7hrs" />
            </Picker>
          </View>

          <Text style={styles.label}>Daytime Fatigue (0-10)</Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={10}
              step={1}
              value={formData.daytime_fatigue_score}
              onValueChange={(v: number) => update('daytime_fatigue_score', v)}
              minimumTrackTintColor="#7E57C2"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#5E35B1"
            />
            <View style={styles.sliderValueBox}>
              <Text style={styles.sliderValue}>{formData.daytime_fatigue_score}</Text>
            </View>
          </View>

          <Text style={styles.label}>Baby Sleep Pattern</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.baby_sleep_pattern}
              onValueChange={(v) =>
                update('baby_sleep_pattern', v)
              }
            >
              <Picker.Item label="Frequent waking" value="frequent" />
              <Picker.Item label="3-4 hrs" value="3-4hrs" />
              <Picker.Item label="5+ hrs" value="5+hrs" />
            </Picker>
          </View>
        </View>

        {/* ---------------- Nutrition ---------------- */}
        <View style={styles.card4}>
          <Text style={styles.cardTitle}>🥗 Nutrition</Text>

          <Text>Meals Per Day</Text>
          <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={formData.meals_per_day}
          onValueChange={(v) => update('meals_per_day', v)}
        >
          <Picker.Item label="2 meals" value="2" />
          <Picker.Item label="3 meals" value="3" />
          <Picker.Item label=">3 meals" value=">3" />
        </Picker>
              </View>
        <Text>Protein Intake</Text>
        <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={formData.protein_intake}
          onValueChange={(v) => update('protein_intake', v)}
        >
          <Picker.Item label="Rare" value="rare" />
          <Picker.Item label="Sometimes" value="sometimes" />
          <Picker.Item label="Adequate" value="adequate" />
          <Picker.Item label="High" value="high" />
        </Picker>
        </View>
{/*
        <Text>Iron Intake</Text>
        <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={formData.iron_intake}
          onValueChange={(v) => update('iron_intake', v)}
        >
          <Picker.Item label="Rare" value="rare" />
          <Picker.Item label="Sometimes" value="sometimes" />
          <Picker.Item label="Daily" value="daily" />
        </Picker>
        </View>
*/}
        <Text>Fluid Intake</Text>
        <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={formData.fluid_intake}
          onValueChange={(v) => update('fluid_intake', v)}
        >
          <Picker.Item label="<1 L" value="<1L" />
          <Picker.Item label="1-2 L" value="1-2L" />
          <Picker.Item label="2-3 L" value="2-3L" />
          <Picker.Item label=">3 L" value=">3L" />
        </Picker>
        </View>

        <Text>Fruit and Vegetable Intake</Text>
        <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={formData.fruit_veg_intake}
          onValueChange={(v) => update('fruit_veg_intake', v)}
        >
          <Picker.Item label="<1 serving" value="<1" />
          <Picker.Item label="1-2 servings" value="1-2times" />
          <Picker.Item label="3+ servings" value="3+" />
        </Picker>
        </View>
        </View>
        

        {/* ---------------- Activity ---------------- */}
        <View style={styles.card5}>
          <Text style={styles.cardTitle}>🏃 Activity & Posture</Text>

          <Text style={styles.label}>Physical Activity</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.physical_activity}
              onValueChange={(v) => update('physical_activity', v)}
            >
              <Picker.Item label="None" value="none" />
              <Picker.Item label="<15 mins" value="<15mins" />
              <Picker.Item label="15-30 mins" value="15-30mins" />
              <Picker.Item label=">30 mins" value=">30mins" />
            </Picker>
          </View>

          <Text style={styles.label}>Feeding Posture</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.feeding_posture}
              onValueChange={(v) => update('feeding_posture', v)}
            >
              <Picker.Item label="Upright" value="upright" />
              <Picker.Item label="Leaning" value="leaning" />
              <Picker.Item label="Lying" value="lying" />
              <Picker.Item label="Mixed" value="mixed" />
            </Picker>
          </View>

          <Text style={styles.label}>Lifting Posture</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.lifting_posture}
              onValueChange={(v) => update('lifting_posture', v)}
            >
              <Picker.Item label="Neutral" value="neutral" />
              <Picker.Item label="Hunched" value="hunched" />
              <Picker.Item label="Unsure" value="unsure" />
            </Picker>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Predicting...' : 'Get My Recovery Insights'}
          </Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Results 
        {result?.predictions && (
          <View style={styles.card6}>
            <Text style={styles.cardTitle}>Prediction Results</Text>

            {['perineal', 'csection', 'back_pelvic'].map((type) => (
              <View
                key={type}
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: getRiskColor(
                      result.predictions?.[type]?.risk
                    ),
                  },
                ]}
              >
                <Text style={{ fontWeight: '700' }}>
                  {type.replace('_', ' ').toUpperCase()}
                </Text>
                <Text>{result.predictions?.[type]?.risk ?? 'N/A'}</Text>
              </View>
            ))}

            <Text style={[styles.cardTitle, { marginTop: 16 }]}>
              Personalized Recovery Guidance
            </Text>

            {Array.isArray(result.guidance?.model_based) &&
              result.guidance.model_based.map((tip, index) => (
                <Text key={`${tip}-${index}`} style={{ marginBottom: 6 }}>
                  • {tip}
                </Text>
              ))}

            <Text style={styles.disclaimer}>
             ⚠️ This guidance supports recovery and does not replace medical advice.
            </Text>
          </View>
        )}*/}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
    backgroundColor: '#ebe9f6',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    color: '#49289e',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  card1: {
    backgroundColor: '#f6ebf9',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
  },
  card2: {
    backgroundColor: '#ebf9f2',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
  },
  card3: {
    backgroundColor: '#f6f9eb',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
  },
  card4: {
    backgroundColor: '#f9ebec',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
  },
  card5: {
    backgroundColor: '#ecf9eb',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
  },
  card6: {
    backgroundColor: '#f0ebf9',
    borderRadius: 18,
    padding: 25,
    marginBottom: 18,
    elevation: 3,
    marginTop: 30,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    color: '#28369e',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 14,
    fontSize: 15,
  },
  pickerWrapper: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sliderContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValueBox: {
    backgroundColor: '#7E57C2',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sliderValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#1313ec',
    padding: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resultCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  navBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end', // pushes content to right
  paddingHorizontal: 20,
  paddingVertical: 10,
  paddingTop: 15, // 👈 move bar down
  backgroundColor: '#b4d2fc',
  elevation: 4,
  borderRadius: 20,
  marginTop: 30,
  zIndex: 1000,
},
  hamburger: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    
  },
  menu: {
  position: 'absolute',
  top: 55,       // adjust slightly below navbar
  right: 20,     // align with hamburger (same as paddingHorizontal)
  backgroundColor: '#fff',
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  elevation: 8,
  shadowColor: '#3223d2',
  shadowOpacity: 0.15,
  shadowRadius: 6,
},
  menuItem: {
  paddingVertical: 8,
  fontSize: 16,
  fontWeight: '600',
},
});
