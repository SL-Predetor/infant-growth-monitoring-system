import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function BehaviorScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>BabySense AI</Text>
          <Text style={styles.headerTitle}>Behavior & Development</Text>
        </View>

        {/* Feature Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => router.push('/asd-home')}
        >
          <View style={styles.cardIconRow}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>🧠</Text>
            </View>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>Research</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>ASD Early Detection</Text>
          <Text style={styles.cardSubtitle}>
            AI-powered autism screening using facial analysis and behavioral questionnaire
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>Start Screening</Text>
            <Text style={styles.cardArrow}>→</Text>
          </View>
        </TouchableOpacity>


        {/* Coming Soon Card */}
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonIconRow}>
            <View style={[styles.iconBadge, { backgroundColor: '#F0FFF4' }]}> 
              <Text style={styles.iconText}>👁️</Text>
            </View>
            <View style={[styles.cardBadge, { backgroundColor: '#34C759' }]}> 
              <Text style={styles.cardBadgeText}>Coming Soon</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>Eye Gaze Analysis</Text>
          <Text style={styles.cardSubtitle}>
            Real-time gaze tracking to detect visual attention patterns associated with developmental milestones
          </Text>
          {/* Footer line for visual consistency */}
          <View style={styles.comingSoonFooter} />
        </View>

        {/* Info note */}
        <View style={styles.note}>
          <Text style={styles.noteText}>
            This tool is for early screening only and does not replace clinical diagnosis.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  header: {
    marginBottom: 28,
  },
  headerLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  cardBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#6E6E73',
    lineHeight: 22,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 16,
  },
  cardFooterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  cardArrow: {
    fontSize: 18,
    color: '#007AFF',
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginTop: 12, // slightly reduced
    marginBottom: 8, // add bottom margin to tighten space
    opacity: 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  comingSoonFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 12,
  },
  comingSoonIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  note: {
    marginTop: 'auto',
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  noteText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
