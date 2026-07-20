import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDashboardStats = (period = 'daily') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://127.0.0.1:8000/api/analytics/dashboard/?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  return { data, loading, error, refetch: fetchStats };
};
