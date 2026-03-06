import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PostpartumHistory() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Postpartum History</Text>
            <Text>Here you can view past recovery submissions and insights.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#FAF9F6',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
    },
});
