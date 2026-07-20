import { useState, useEffect } from 'react';
import axios from 'axios';

export const useRealtimeAnalytics = (period = 'daily', refreshIntervalMs = 30000) => {
  const [realtimeData, setRealtimeData] = useState({
    activeUsers: 0,
    ordersToday: 0,
    revenueToday: 0,
    visitorsToday: 0
  });

  useEffect(() => {
    let intervalId;

    const fetchRealtime = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://127.0.0.1:8000/api/analytics/dashboard/?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        setRealtimeData({
          activeUsers: data.users?.active || 0,
          ordersToday: data.orders?.today || 0,
          revenueToday: data.orders?.revenue || 0,
          visitorsToday: data.visits?.today || 0
        });
      } catch (err) {
        // Silently fail for polling
      }
    };

    // Initial fetch
    fetchRealtime();

    intervalId = setInterval(fetchRealtime, refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, [period, refreshIntervalMs]);

  return realtimeData;
};
