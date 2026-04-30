import { Platform } from 'react-native';

/**
 * Dynamic API Base URL Configuration
 * 
 * Supports development, staging, and production environments.
 * Automatically detects backend based on environment.
 */

export const getApiBaseUrl = (): string => {
  const env = process.env.NODE_ENV || 'development';
  
  // Production: use deployed API
  if (env === 'production') {
    return process.env.REACT_APP_PROD_API_URL || 'https://api.tinysteps.app';
  }
  
  // Staging: use staging API
  if (env === 'staging') {
    return process.env.REACT_APP_STAGING_API_URL || 'https://staging-api.tinysteps.app';
  }
  
  // Development: check env var first
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    let url = process.env.EXPO_PUBLIC_API_BASE_URL.trim().replace(/\/+$/, '');
    // Convert localhost:8000 → 127.0.0.1:9000
    url = url.replace(/localhost:8000/, '127.0.0.1:9000');
    // Ensure http:// prefix
    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }
    return url;
  }
  
  // Web: auto-detect using hostname
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:9000`;
  }
  
  // Fallback: localhost port 9000
  return 'http://127.0.0.1:9000';
};

// Log the resolved URL (helpful for debugging)
console.log('🔗 API Base URL:', getApiBaseUrl());
