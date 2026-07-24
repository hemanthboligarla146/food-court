import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Generate a random UUID-like key for anonymous session tracking
export const getOrCreateSessionKey = () => {
  let sessionKey = sessionStorage.getItem('analytics_session_key');
  if (!sessionKey) {
    sessionKey = 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_key', sessionKey);
    
    // Start session on backend
    axios.post(`${API_URL}/analytics/session/start/`, { session_key: sessionKey })
      .catch(err => console.error('Failed to start session:', err));
  }
  return sessionKey;
};

// Merge anonymous session with logged-in user
export const mergeSessionWithUser = (token) => {
  const sessionKey = sessionStorage.getItem('analytics_session_key');
  if (sessionKey && token) {
    axios.post(
      `${API_URL}/analytics/session/merge/`, 
      { session_key: sessionKey },
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(err => console.error('Failed to merge session:', err));
  }
};

export const usePageTracking = () => {
  const location = useLocation();
  const user = useSelector(state => state.auth?.user);
  const entryTimeRef = useRef(Date.now());
  const lastTrackedPathRef = useRef(null);

  // Core helper to record an event
  const recordEvent = (eventType, pagePath, timeSpent = null) => {
    const sessionKey = getOrCreateSessionKey();
    const isAdmin = user && (user.is_staff || user.is_superuser);
    
    // Never track admins or admin routes
    if (isAdmin || pagePath.startsWith('/admin')) {
      return;
    }

    const payload = {
      session_key: sessionKey,
      event_type: eventType,
      page_path: pagePath,
      time_on_page: timeSpent
    };

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // Use beacon if page is unloading, else regular axios post
    if (eventType === 'page_view' && timeSpent !== null) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/analytics/event/`, blob);
    } else {
      axios.post(`${API_URL}/analytics/event/`, payload, { headers })
        .catch(() => {}); // silently swallow errors
    }
  };

  useEffect(() => {
    const currentPath = location.pathname;

    // Only record page_view if path actually changed to prevent duplicate logs on state/auth updates
    if (lastTrackedPathRef.current !== currentPath) {
      recordEvent('page_view', currentPath);
      lastTrackedPathRef.current = currentPath;
      entryTimeRef.current = Date.now();
    }

    // On unmount/navigation away, calculate time spent and log it
    return () => {
      const exitTime = Date.now();
      const timeSpentSeconds = Math.round((exitTime - entryTimeRef.current) / 1000);
      
      if (timeSpentSeconds > 0 && lastTrackedPathRef.current === currentPath) {
        recordEvent('page_view', currentPath, timeSpentSeconds);
      }
    };
  }, [location.pathname]); // Only depend on pathname!

  // Handle page closing/unload to capture final page duration
  useEffect(() => {
    const handleUnload = () => {
      const exitTime = Date.now();
      const timeSpentSeconds = Math.round((exitTime - entryTimeRef.current) / 1000);
      if (timeSpentSeconds > 0) {
        recordEvent('page_view', currentPageRef.current, timeSpentSeconds);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);
};

export const useTracker = () => {
  const user = useSelector(state => state.auth?.user);

  const trackEvent = (eventType, data = {}) => {
    const sessionKey = getOrCreateSessionKey();
    const isAdmin = user && (user.is_staff || user.is_superuser);
    
    // Never track admin actions
    if (isAdmin) return;

    const payload = {
      session_key: sessionKey,
      event_type: eventType,
      page_path: window.location.pathname,
      food_id: data.foodId || null,
      category_id: data.categoryId || null,
      search_term: data.searchTerm || '',
      extra: data.extra || {}
    };

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.post(`${API_URL}/analytics/event/`, payload, { headers })
      .catch(() => {});
  };

  return { trackEvent };
};
