import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js';

// Initialize PostHog (Safe fallback if key is missing)
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false, // We'll manually capture specific events
    capture_pageview: false, // We handle this manually on route change
  });
}

export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (POSTHOG_KEY) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        path: location.pathname
      });
    }
  }, [location]);

  return {
    trackFoodClick: (foodId, categoryId) => {
      if (POSTHOG_KEY) posthog.capture('Food Click', { foodId, categoryId });
    },
    trackAddToCart: (foodId) => {
      if (POSTHOG_KEY) posthog.capture('Add to Cart', { foodId });
    },
    trackRemoveCart: (foodId) => {
      if (POSTHOG_KEY) posthog.capture('Remove from Cart', { foodId });
    },
    trackCheckoutStarted: () => {
      if (POSTHOG_KEY) posthog.capture('Checkout Started');
    },
    trackSearch: (keyword, resultCount) => {
      if (POSTHOG_KEY) posthog.capture('Search', { keyword, resultCount });
    },
    identifyUser: (userId, traits = {}) => {
      if (POSTHOG_KEY) posthog.identify(userId, traits);
    },
    resetUser: () => {
      if (POSTHOG_KEY) posthog.reset();
    }
  };
};
