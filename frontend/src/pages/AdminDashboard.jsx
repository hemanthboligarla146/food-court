import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { 
  FiHome, FiUsers, FiList, FiGrid, FiShoppingBag, FiPieChart, 
  FiFileText, FiSettings, FiLogOut, FiArrowUp, FiArrowDown,
  FiEdit2, FiTrash2, FiPlus, FiImage, FiX
} from 'react-icons/fi';
import { logout } from '../store/authSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MetricCard = ({ icon, title, value, change }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className="text-xl font-bold text-[#1B2559] leading-none">{value}</p>
        <p className="text-[10px] text-green-500 font-bold mb-0.5">{change}</p>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  
  const [activeTab, setActiveTab] = useState('analytics'); // analytics represents the new complex dashboard
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogFoods, setCatalogFoods] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingFood, setEditingFood] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [foodForm, setFoodForm] = useState({ name: '', description: '', price: '', category: '', is_available: true, is_featured: false, is_trending: false });
  const [foodImage, setFoodImage] = useState(null);

  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');

  useEffect(() => {
    if (!user || !user.is_staff) {
      navigate('/admin-login');
    }
  }, [user, navigate]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`analytics/dashboard/?period=${analyticsPeriod}`);
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
      setError(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 30 seconds as requested (Phase 9/Auto-refresh)
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [analyticsPeriod]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'foods' || activeTab === 'categories') fetchCatalog();
  }, [activeTab]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await api.get('orders/admin/manage/');
      setOrders(response.data.results || response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`orders/admin/manage/${orderId}/`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Failed to update order status');
    }
  };

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const [catsRes, foodsRes] = await Promise.all([
        api.get('foods/admin/manage/categories/'),
        api.get('foods/admin/manage/foods/')
      ]);
      setCatalogCategories(catsRes.data.results || catsRes.data);
      setCatalogFoods(foodsRes.data.results || foodsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`foods/admin/manage/categories/${editingCategory.id}/`, categoryForm);
      } else {
        await api.post('foods/admin/manage/categories/', categoryForm);
      }
      setShowCategoryModal(false);
      fetchCatalog();
    } catch (err) { 
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(', ') : err.message;
      alert(`Failed to save category: ${msg}`); 
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`foods/admin/manage/categories/${id}/`);
      fetchCatalog();
    } catch (err) { 
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(', ') : err.message;
      alert(`Failed to delete category: ${msg}`); 
    }
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(foodForm).forEach(key => formData.append(key, foodForm[key]));
    if (foodImage) formData.append('image', foodImage);
    
    try {
      if (editingFood) {
        await api.put(`foods/admin/manage/foods/${editingFood.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
        await api.post('foods/admin/manage/foods/', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      }
      setShowFoodModal(false);
      fetchCatalog();
    } catch (err) { 
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(', ') : err.message;
      alert(`Failed to save food: ${msg}`); 
    }
  };

  const handleDeleteFood = async (id) => {
    if (!window.confirm('Are you sure you want to delete this food item?')) return;
    try {
      await api.delete(`foods/admin/manage/foods/${id}/`);
      fetchCatalog();
    } catch (err) { 
      const msg = err.response?.data ? Object.values(err.response.data).flat().join(', ') : err.message;
      alert(`Failed to delete food: ${msg}`); 
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/admin-login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading dashboard...</div>;
  if (error && !data) return <div className="min-h-screen flex items-center justify-center text-red-500 bg-gray-50">{error?.message || String(error)}</div>;

  // Chart configs
  const lineOptions = { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { display: false } } };
  const doughnutOptions = { maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10 } } } };

  return (
    <div className="flex h-screen bg-[#F4F7FE] font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-[#111C44] text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center font-bold text-white">FC</div>
          <div>
            <h2 className="font-bold tracking-wider text-sm">FOOD COURT</h2>
            <p className="text-xs text-gray-400">ADMIN</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-2 px-4">
            <li><button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><FiPieChart /> Dashboard</button></li>
            <li><button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"><FiUsers /> Users</button></li>
            <li><button onClick={() => setActiveTab('foods')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'foods' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><FiList /> Foods</button></li>
            <li><button onClick={() => setActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'categories' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><FiGrid /> Categories</button></li>
            <li><button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><FiShoppingBag /> Orders</button></li>
            <li><button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"><FiFileText /> Reports</button></li>
            <li><button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"><FiSettings /> Settings</button></li>
          </ul>
        </div>
        
        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5">
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 px-8 flex justify-between items-center z-10">
          <h1 className="text-xl font-bold text-[#1B2559]">
            {activeTab === 'analytics' ? 'Admin Dashboard (Analytics)' : 
             activeTab === 'orders' ? 'Order Management' : 
             activeTab === 'foods' ? 'Food Management' : 'Category Management'}
          </h1>
        </div>

        <div className="p-8">
          {activeTab === 'analytics' && (
            <>
            <div className="mb-6 flex gap-2">
              {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${analyticsPeriod === p ? 'bg-[#1B2559] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-6 pb-4">
              {/* Row 1: Top Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard icon={<FiUsers className="text-blue-500" />} title="Total Users" value={data.users?.total || 0} change="+18.7%" />
                <MetricCard icon={<FiUsers className="text-green-500" />} title="New Users" value={data.users?.today || 0} change="+24.3%" />
                <MetricCard icon={<FiUsers className="text-purple-500" />} title="Returning Users" value={data.users?.returning || 0} change="+16.4%" />
                <MetricCard icon={<FiShoppingBag className="text-blue-400" />} title="Total Orders" value={data.orders?.total || 0} change="+15.3%" />
                <MetricCard icon={<FiList className="text-green-500" />} title="Completed Orders" value={data.orders?.completed || 0} change="+16.8%" />
                <MetricCard icon={<FiPieChart className="text-yellow-500" />} title="Total Revenue" value={`$${data.orders?.revenue || 0}`} change="+25.8%" />
              </div>

              {/* Row 2: Funnel, Page Visits, Menu Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">User Journey (Funnel Analysis)</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex text-xs font-bold text-gray-500 mb-2 px-2">
                      <div className="w-1/2">Step</div>
                      <div className="w-1/4 text-right">Users</div>
                      <div className="w-1/4 text-right">Conversion</div>
                    </div>
                    {data.funnel_data?.map((step, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <div className="w-1/2 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${220 - idx * 20}, 80%, 60%)` }}></div>
                          <span className="truncate">{step.step}</span>
                        </div>
                        <div className="w-1/4 text-right font-medium">{step.users}</div>
                        <div className="w-1/4 text-right font-bold text-[#1B2559]">{step.conversion}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Page Visits (User Behavior)</h3>
                  <div className="flex flex-col gap-3 h-[250px] overflow-y-auto pr-2">
                    {data.page_visits_chart?.map((pv, i) => (
                      <div key={i} className="flex flex-col text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="truncate text-gray-700">{pv.page}</span>
                          <span className="font-bold">{pv.visits}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (pv.visits / (data.page_visits_chart[0]?.visits || 1)) * 100)}%`, backgroundColor: `hsl(${220 - i * 30}, 80%, 50%)` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Menu Analytics Overview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Total Menu Visits</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.total_visits || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Unique Visitors</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.unique_visitors || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Avg. Time</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.avg_time || '0s'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Categories Opened</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.categories_opened || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Items Viewed</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.items_viewed || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Item Clicks</p>
                      <p className="text-xl font-bold text-[#1B2559]">{data.menu_analytics?.item_clicks || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Food Items, Category Pie, Heatmap */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
                  <h3 className="font-bold text-[#1B2559] mb-4">Most Clicked Food Items</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="pb-2">Food Item</th>
                        <th className="pb-2">Views</th>
                        <th className="pb-2">Clicks</th>
                        <th className="pb-2">Add to Cart</th>
                        <th className="pb-2">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.food_item_table?.slice(0, 5).map((f, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 font-medium truncate max-w-[120px]">{f.food__name}</td>
                          <td className="py-2">{f.views}</td>
                          <td className="py-2">{f.clicks}</td>
                          <td className="py-2">{f.adds}</td>
                          <td className="py-2">{f.orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Category Analytics</h3>
                  <div className="h-48">
                    <Pie data={{
                      labels: data.category_analytics?.map(c => c.name) || [],
                      datasets: [{
                        data: data.category_analytics?.map(c => c.visits) || [],
                        backgroundColor: ['#4318FF', '#00B5D8', '#F59E0B', '#10B981', '#E11D48', '#8B5CF6']
                      }]
                    }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }} />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Food Item Click Heatmap (Top 10)</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 border-b">
                        <th className="pb-2">Food Item</th>
                        <th className="pb-2 text-center">Clicks Today</th>
                        <th className="pb-2 text-right">% Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.food_item_heatmap?.slice(0, 5).map((f, i) => (
                        <tr key={i}>
                          <td className="py-1.5 font-medium truncate max-w-[120px]">{f.name}</td>
                          <td className="py-1.5 flex justify-center">
                            <div className="bg-green-100 text-green-800 text-center rounded px-4 py-0.5" style={{ opacity: Math.max(0.2, (f.clicks/(data.food_item_heatmap[0]?.clicks || 1))) }}>
                              {f.clicks}
                            </div>
                          </td>
                          <td className="py-1.5 text-xs text-green-600 font-bold text-right">&uarr; {f.change}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 4: Search Analytics, Orders Trend, Peak Hours */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Search Analytics</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Searches</p>
                      <p className="text-lg font-bold text-[#1B2559]">{data.searches?.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Successful Searches</p>
                      <p className="text-lg font-bold text-[#1B2559]">{data.searches?.successful || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">No Result Searches</p>
                      <p className="text-lg font-bold text-[#1B2559]">{data.searches?.no_result || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conversion</p>
                      <p className="text-lg font-bold text-[#1B2559]">{data.searches?.conversion || 0}%</p>
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-[#1B2559] mb-2 border-t pt-4">Top Search Keywords</h4>
                  <div className="space-y-2">
                    {data.top_searches?.slice(0,4).map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 capitalize w-16 truncate">{s.search_keyword}</span>
                        <div className="flex-1 mx-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (s.count/(data.searches?.total||1))*100)}%` }}></div>
                        </div>
                        <span className="font-bold text-[#1B2559] w-8 text-right">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Orders Trend</h3>
                  <div className="h-48">
                    <Line data={{
                      labels: data.orders_trend?.map(t => t.date) || [],
                      datasets: [{ data: data.orders_trend?.map(t => t.count) || [], borderColor: '#4318FF', tension: 0.4, borderWidth: 2 }]
                    }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Peak Hours (Orders)</h3>
                  <div className="flex h-48">
                    <div className="flex flex-col justify-between text-xs text-gray-500 pr-2 py-1">
                      <span>12A</span>
                      <span>6A</span>
                      <span>12P</span>
                      <span>6P</span>
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
                        <div key={day} className="flex flex-col h-full">
                          <div className="flex flex-col flex-1 gap-[1px]">
                            {Array.from({ length: 24 }).map((_, hIdx) => {
                               const backendDay = dIdx === 6 ? 1 : dIdx + 2; 
                               const dayData = data.peak_hours_matrix?.find(x => x.day === backendDay);
                               const count = dayData?.hours[hIdx] || 0;
                               const maxCount = Math.max(...(data.peak_hours_matrix?.flatMap(x => x.hours) || [1]));
                               const opacity = count === 0 ? 0.05 : Math.max(0.2, count / maxCount);
                               return <div key={hIdx} className="w-full bg-[#4318FF] flex-1" style={{ opacity }} title={`${day} ${hIdx}:00 - ${count} orders`}></div>
                            })}
                          </div>
                          <span className="text-[10px] text-gray-500 text-center mt-1">{day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 5: Top Devices, Order Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Top Devices</h3>
                  <div className="h-40 flex items-center justify-center">
                    <Doughnut data={{
                      labels: data.top_devices?.map(d => d.name) || [],
                      datasets: [{
                        data: data.top_devices?.map(d => d.count) || [],
                        backgroundColor: ['#00B5D8', '#4318FF', '#F59E0B']
                      }]
                    }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1B2559] mb-4">Order Status Summary</h3>
                  <div className="h-40 flex items-center justify-center">
                    <Doughnut data={{
                      labels: ['Completed', 'Processing', 'Cancelled', 'Pending'],
                      datasets: [{
                        data: [data.orders?.completed || 0, data.orders?.processing || 0, data.orders?.cancelled || 0, data.orders?.pending || 0],
                        backgroundColor: ['#10B981', '#00B5D8', '#E11D48', '#F59E0B']
                      }]
                    }} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-2 overflow-x-auto">
                {['All', 'Pending', 'Processing', 'Out for Delivery', 'Completed', 'Cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => setOrderFilter(status)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${orderFilter === status ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <div className="p-0 overflow-x-auto">
                {ordersLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading orders...</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.filter(o => orderFilter === 'All' || o.status === orderFilter).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No orders found.</td>
                        </tr>
                      ) : orders.filter(o => orderFilter === 'All' || o.status === orderFilter).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">${order.total_amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {order.status === 'Pending' && (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'Processing')} className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors">Accept</button>
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'Cancelled')} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md transition-colors">Reject</button>
                              </div>
                            )}
                            {order.status === 'Processing' && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'Out for Delivery')} className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors">Send Out</button>
                            )}
                            {order.status === 'Out for Delivery' && (
                              <button onClick={() => handleUpdateOrderStatus(order.id, 'Completed')} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md transition-colors">Mark Delivered</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'foods' || activeTab === 'categories') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">{activeTab === 'foods' ? 'Food Items' : 'Categories'}</h2>
                <button 
                  onClick={() => {
                    if (activeTab === 'categories') {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', description: '' });
                      setShowCategoryModal(true);
                    } else {
                      setEditingFood(null);
                      setFoodForm({ name: '', description: '', price: '', category: catalogCategories.length > 0 ? catalogCategories[0].id : '', is_available: true, is_featured: false, is_trending: false });
                      setFoodImage(null);
                      setShowFoodModal(true);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B2559] text-white rounded-md hover:bg-opacity-90 transition-colors"
                >
                  <FiPlus /> Add New
                </button>
              </div>
              
              <div className="p-0 overflow-x-auto">
                {catalogLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading catalog...</div>
                ) : activeTab === 'categories' ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {catalogCategories.length === 0 ? (
                        <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500">No categories found.</td></tr>
                      ) : catalogCategories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => { setEditingCategory(cat); setCategoryForm({name: cat.name, description: cat.description}); setShowCategoryModal(true); }} className="text-blue-600 hover:text-blue-900 mr-4"><FiEdit2 size={18} /></button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-900"><FiTrash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {catalogFoods.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No foods found.</td></tr>
                      ) : catalogFoods.map((food) => (
                        <tr key={food.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {food.image ? <img src={food.image.startsWith('http') ? food.image : `http://localhost:8000${food.image}`} alt={food.name} className="h-10 w-10 rounded-md object-cover" /> : <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center"><FiImage className="text-gray-400" /></div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{food.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${food.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{food.category_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {food.is_available ? <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs font-bold">Available</span> : <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs font-bold">Unavailable</span>}
                            {food.is_featured && <span className="ml-2 text-purple-600 bg-purple-100 px-2 py-1 rounded text-xs font-bold">Featured</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onClick={() => { setEditingFood(food); setFoodForm({name: food.name, description: food.description, price: food.price, category: food.category, is_available: food.is_available, is_featured: food.is_featured, is_trending: food.is_trending}); setShowFoodModal(true); }} className="text-blue-600 hover:text-blue-900 mr-4"><FiEdit2 size={18} /></button>
                            <button onClick={() => handleDeleteFood(food.id)} className="text-red-600 hover:text-red-900"><FiTrash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={24}/></button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" required value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" rows="3"></textarea>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2559] text-white rounded-md hover:bg-opacity-90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Food Modal */}
      {showFoodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingFood ? 'Edit Food' : 'Add Food'}</h3>
              <button onClick={() => setShowFoodModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={24}/></button>
            </div>
            <form onSubmit={handleSaveFood}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" required value={foodForm.name} onChange={e => setFoodForm({...foodForm, name: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select required value={foodForm.category} onChange={e => setFoodForm({...foodForm, category: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md">
                    <option value="">Select Category</option>
                    {catalogCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input type="number" step="0.01" required value={foodForm.price} onChange={e => setFoodForm({...foodForm, price: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={foodForm.description} onChange={e => setFoodForm({...foodForm, description: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" rows="3"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setFoodImage(e.target.files[0])} 
                    className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#1B2559] file:text-white hover:file:bg-opacity-90 cursor-pointer" 
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <input 
                      type="checkbox" 
                      checked={!foodForm.is_available} 
                      onChange={e => {
                        const outOfStock = e.target.checked;
                        if (outOfStock) {
                          setFoodForm({...foodForm, is_available: false, is_featured: false, is_trending: false});
                        } else {
                          setFoodForm({...foodForm, is_available: true});
                        }
                      }} 
                    /> Out of Stock
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={foodForm.is_available} 
                      onChange={e => setFoodForm({...foodForm, is_available: e.target.checked})} 
                    /> Available
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${!foodForm.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={foodForm.is_featured} 
                      disabled={!foodForm.is_available}
                      onChange={e => setFoodForm({...foodForm, is_featured: e.target.checked})} 
                    /> Featured
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${!foodForm.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={foodForm.is_trending} 
                      disabled={!foodForm.is_available}
                      onChange={e => setFoodForm({...foodForm, is_trending: e.target.checked})} 
                    /> Trending
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFoodModal(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#1B2559] text-white rounded-md hover:bg-opacity-90">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
