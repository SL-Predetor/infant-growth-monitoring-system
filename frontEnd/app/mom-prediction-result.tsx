import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
const { width } = Dimensions.get('window');

export default function MomPredictionResultsScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const result = params.result ? JSON.parse(params.result as string) : null;

    const painConfig: any = {
        perineal: {
            label: 'Perineal Pain',
            icon: '🩸', // Updated to a softer icon
            color: '#FF6B6B',
        },
        csection: {
            label: 'C-Section Recovery',
            icon: '🩹',
            color: '#4D96FF',
        },
        back_pelvic: {
            label: 'Pelvic-Back Support',
            icon: '🦴',
            color: '#6BCB77',
        },
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#49289e" />
                </TouchableOpacity>
                <Text style={styles.header}>Recovery Insights</Text>
                <Text style={styles.subHeader}>Based on your recent assessment data</Text>
            </View>

            <View style={styles.sectionContainer}>

                {Object.entries(result?.predictions || {}).map(([type, value]: any) => {
                    if (!value || value.score === 0) return null;

                    const config = painConfig[type] || { label: type, icon: '📋', color: '#666' };
                    const isHighRisk = value.risk === 'HIGH';

                    return (
                        <View key={type} style={styles.card}>
                            <View style={styles.cardRow}>
                                <View style={[styles.iconBox, { backgroundColor: config.color + '20' }]}>
                                    <Text style={styles.iconText}>{config.icon}</Text>
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.title}>{config.label}</Text>
                                    <Text style={styles.scoreText}>Score: {Math.round(Number(value.score))}/10</Text>
                                    <View style={[styles.badge, isHighRisk ? styles.highBadge : styles.modBadge]}>
                                        <Text style={[styles.badgeText, isHighRisk ? styles.highText : styles.modText]}>
                                            {isHighRisk ? '• HIGH RISK' : '• MODERATE RISK'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
                <Text style={styles.sectionTitle}>Daily Care Routine</Text>
            </View>

            <View style={styles.guidanceCard}>

                <Text style={styles.guidanceTitle}>Recovery Actions</Text>

                <View style={styles.divider} />
                {result?.guidance?.model_based?.map((tip: string, index: number) => (
                    <View key={index} style={styles.tipRow}>
                        <View style={styles.bullet} />
                        <Text style={styles.tipText}>{tip}</Text>
                    </View>
                ))}

                <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimer}>
                        ⚠️ This guidance supports recovery and does not replace professional medical advice.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FE', // Cleaner, lighter background
    },
    headerContainer: {
        paddingTop: 50,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#bfeea9',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    backButton: {
        marginBottom: 12,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    subHeader: {
        fontSize: 14,
        color: '#7C7C7C',
        marginTop: 4,
    },
    sectionContainer: {
        padding: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 5,
    },
    card: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconText: {
        fontSize: 24,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D2D2D',
        marginBottom: 4,
    },
    scoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 6,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    highBadge: { backgroundColor: '#FFE5E5' },
    modBadge: { backgroundColor: '#FFF4E5' },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    highText: { color: '#D63031' },
    modText: { color: '#B07D05' },
    guidanceCard: {
        marginHorizontal: 24,
        marginBottom: 40,
        backgroundColor: '#a1baee', // Primary theme color
        borderRadius: 24,
        padding: 24,
        elevation: 8,
        shadowColor: '#6C63FF',
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    guidanceTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 20,
    },
    tipRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-start',
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        marginTop: 8,
        marginRight: 10,
        opacity: 0.8,
    },
    tipText: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.9,
    },
    disclaimerBox: {
        marginTop: 10,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    disclaimer: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
