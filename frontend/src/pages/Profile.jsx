import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { logout } from '../store/authSlice';
import { FiLogOut, FiSettings, FiUser, FiHeart, FiMapPin, FiCreditCard, FiPackage, FiPlus, FiTrash2, FiEdit2, FiCheckCircle, FiStar, FiX } from 'react-icons/fi';
import { useTracker } from '../hooks/useTracker';

const Profile = () => {
  const { trackEvent } = useTracker();
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wishlistItems, setWishlistItems] = useState([]);
  
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  
  const [addressForm, setAddressForm] = useState({ title: 'Home', street_address: '', city: '', zip_code: '', is_default: false });
  const [paymentForm, setPaymentForm] = useState({ card_type: 'Visa', last_four_digits: '', expiry_date: '', is_default: false });
  const [settings, setSettings] = useState({ emailNotifications: true, smsNotifications: false, darkTheme: false });

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', orderId: null });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        address: user.address || '',
        password: ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchOrders();
      fetchWishlist();
      fetchAddresses();
      fetchPaymentMethods();
    }
  }, [user, token, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('users/addresses/');
      setAddresses(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('users/payments/');
      setPaymentMethods(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('orders/');
      setOrders(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await api.get('orders/wishlist/');
      setWishlistItems(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleLogout = async () => {
    await trackEvent('user_logout');
    dispatch(logout());
    navigate('/');
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(editForm).forEach(key => {
        if (editForm[key]) {
          data.append(key, editForm[key]);
        }
      });
      if (profilePic) {
        data.append('profile_picture', profilePic);
      }

      // Fetch setUser action from authSlice if needed, or just reload user.
      const response = await api.put('users/profile/', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update redux state with new user data
      dispatch({ type: 'auth/setUser', payload: response.data });
      setIsEditing(false);
      setProfilePic(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.street_address || !addressForm.city || !addressForm.zip_code) {
      alert("Please fill in all required fields (Street Address, City, Zip Code).");
      return;
    }
    try {
      if (editingAddressId) {
        await api.put(`users/addresses/${editingAddressId}/`, addressForm);
      } else {
        await api.post('users/addresses/', addressForm);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ title: 'Home', street_address: '', city: '', zip_code: '', is_default: false });
      fetchAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      let errMsg = 'Failed to save address. Please try again.';
      if (error.response && error.response.data) {
        errMsg = 'Failed to save address: ' + JSON.stringify(error.response.data);
      } else if (error.message) {
        errMsg = 'Failed to save address: ' + error.message;
      }
      alert(errMsg);
    }
  };

  const handleEditAddress = (address) => {
    setAddressForm({
      title: address.title,
      street_address: address.street_address,
      city: address.city,
      zip_code: address.zip_code,
      is_default: address.is_default
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await api.patch(`users/addresses/${id}/`, { is_default: true });
      fetchAddresses();
    } catch (error) {
      console.error(error);
      alert('Failed to set default address.');
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`users/addresses/${id}/`);
      fetchAddresses();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.last_four_digits || !paymentForm.expiry_date) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      await api.post('users/payments/', paymentForm);
      setShowPaymentForm(false);
      setPaymentForm({ card_type: 'Visa', last_four_digits: '', expiry_date: '', is_default: false });
      fetchPaymentMethods();
    } catch (error) {
      console.error('Error saving payment:', error);
      let errMsg = 'Failed to save payment method. Please try again.';
      if (error.response && error.response.data) {
        errMsg = 'Failed to save payment method: ' + JSON.stringify(error.response.data);
      } else if (error.message) {
        errMsg = 'Failed to save payment method: ' + error.message;
      }
      alert(errMsg);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      await api.delete(`users/payments/${id}/`);
      fetchPaymentMethods();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.orderId) return;
    setSubmittingReview(true);
    try {
      await api.post(`orders/${reviewForm.orderId}/review/`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      alert('Review submitted successfully for all items in the order!');
      setShowReviewModal(false);
      setReviewForm({ rating: 5, comment: '', orderId: null });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!token) return null;
  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading profile...</div>;

  const profileImageUrl = user.profile_picture ? `http://localhost:8000${user.profile_picture}` : null;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 hidden">Profile Page</h1>
        
        <div className="flex flex-col md:flex-row gap-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-full md:w-72 flex-shrink-0 bg-white border-r border-gray-100 p-6">
            <nav className="space-y-2">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'profile' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiUser size={18} /> My Profile
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'orders' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiPackage size={18} /> My Orders
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'wishlist' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiHeart size={18} /> Wishlist
              </button>
              <button 
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'addresses' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiMapPin size={18} /> Addresses
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'payments' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiCreditCard size={18} /> Payment Methods
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'settings' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FiSettings size={18} /> Settings
              </button>
              
              <div className="pt-8 mt-8 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <FiLogOut size={18} /> Logout
                </button>
              </div>
            </nav>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 p-8 md:p-10">
            {activeTab === 'profile' && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h2>
                
                <div className="flex items-center gap-6 mb-10">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shadow-inner relative group">
                    {profilePic ? (
                      <img src={URL.createObjectURL(profilePic)} alt="New Profile" className="w-full h-full object-cover" />
                    ) : profileImageUrl ? (
                      <img src={profileImageUrl} alt={user.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-orange-600">{user.first_name?.[0] || user.username[0]}</span>
                    )}
                    
                    {isEditing && (
                      <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                        Change
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setProfilePic(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h3>
                    <p className="text-gray-500 mb-3">{user.email}</p>
                    
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button disabled={loading} onClick={handleSaveProfile} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-colors">
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button disabled={loading} onClick={() => { setIsEditing(false); setProfilePic(null); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors">
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input 
                        type="text" 
                        readOnly={!isEditing} 
                        value={isEditing ? editForm.first_name : user.first_name} 
                        onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                        className={`w-full px-4 py-3 border rounded-xl text-gray-900 focus:outline-none ${isEditing ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-white border-gray-200'}`} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        readOnly={!isEditing} 
                        value={isEditing ? editForm.last_name : user.last_name} 
                        onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                        className={`w-full px-4 py-3 border rounded-xl text-gray-900 focus:outline-none ${isEditing ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-white border-gray-200'}`} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      type="email" 
                      readOnly={!isEditing} 
                      value={isEditing ? editForm.email : user.email} 
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 focus:outline-none ${isEditing ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-white border-gray-200'}`} 
                    />
                  </div>
                  
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                      <input 
                        type="password" 
                        value={editForm.password} 
                        onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" 
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input 
                      type="tel" 
                      readOnly={!isEditing} 
                      value={isEditing ? editForm.phone_number : (user.phone_number || 'Not provided')} 
                      onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 focus:outline-none ${isEditing ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-white border-gray-200'}`} 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input 
                      type="text" 
                      readOnly={!isEditing} 
                      value={isEditing ? editForm.address : (user.address || 'Not provided')} 
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                      className={`w-full px-4 py-3 border rounded-xl text-gray-900 focus:outline-none ${isEditing ? 'border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-white border-gray-200'}`} 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h2>
                {orders.length > 0 ? (
                  <div className="space-y-6">
                    {orders.map((order, index) => {
                      const userOrderNumber = orders.length - index;
                      return (
                      <div key={order.id} className="border border-gray-200 rounded-xl p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gray-100 pb-4">
                          <div>
                            <p className="text-sm text-gray-500">Order #{userOrderNumber}</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              Ordered on: {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="mt-2 sm:mt-0 text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                              ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                order.status === 'Out for Delivery' ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'}`}>
                              {order.status}
                            </span>
                            <p className="mt-1 font-bold text-gray-900">${order.total_amount}</p>
                          </div>
                        </div>
                        <ul className="space-y-3">
                          {order.items.map(item => (
                            <li key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.quantity} x {item.food_details.name} {item.size && item.size !== 'Medium' ? `(${item.size})` : ''}</span>
                              <span className="text-gray-900 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        {order.status === 'Completed' && !order.is_reviewed && (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                              onClick={() => {
                                setReviewForm({ ...reviewForm, rating: 5, comment: '', orderId: order.id, userOrderNumber: userOrderNumber });
                                setShowReviewModal(true);
                              }}
                              className="px-4 py-2 bg-white border border-orange-500 text-orange-600 hover:bg-orange-50 font-medium rounded-lg text-sm transition-colors"
                            >
                              Review Order
                            </button>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500">You haven't placed any orders yet.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'wishlist' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">My Wishlist</h2>
                {wishlistItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map(item => {
                      const food = item.food_details;
                      const imageUrl = food.image ? (food.image.startsWith('http') ? food.image : `http://localhost:8000${food.image}`) : null;
                      return (
                        <div key={item.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer" onClick={() => navigate(`/menu/${food.id}`)}>
                          <div className="h-44 bg-gray-100 relative overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                            )}
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.delete(`orders/wishlist/${item.id}/`);
                                  setWishlistItems(wishlistItems.filter(w => w.id !== item.id));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="absolute top-3 right-3 w-8 h-8 bg-white text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm"
                            >
                              <FiHeart size={16} className="fill-red-500" />
                            </button>
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-base font-bold text-gray-900 line-clamp-1">{food.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{food.category_name}</p>
                            <div className="mt-4 flex justify-between items-center">
                              <span className="text-lg font-bold text-gray-900">${food.price}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-5xl mb-4 text-gray-300">
                      <FiHeart className="mx-auto" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">Your wishlist is empty</p>
                    <p className="text-gray-500 mt-1">Explore our menu and save your favorite items here.</p>
                    <button onClick={() => navigate('/menu')} className="mt-6 px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
                      Browse Menu
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'addresses' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
                  <button 
                    onClick={() => {
                      setEditingAddressId(null);
                      setAddressForm({ title: 'Home', street_address: '', city: '', zip_code: '', is_default: false });
                      setShowAddressForm(!showAddressForm);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <FiPlus /> Add New
                  </button>
                </div>
                
                {showAddressForm && (
                  <form onSubmit={handleSaveAddress} className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                    <h3 className="font-bold text-gray-900 mb-4">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Title</label>
                        <select value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500">
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Street Address</label>
                        <input type="text" value={addressForm.street_address} onChange={e => setAddressForm({...addressForm, street_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">City</label>
                        <input type="text" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Zip Code</label>
                        <input type="text" value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input type="checkbox" checked={addressForm.is_default} onChange={e => setAddressForm({...addressForm, is_default: e.target.checked})} className="text-orange-500 focus:ring-orange-500 rounded" />
                      <span className="text-sm text-gray-700">Set as default address</span>
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Address</button>
                      <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddressId(null); setAddressForm({ title: 'Home', street_address: '', city: '', zip_code: '', is_default: false }); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map(address => (
                    <div key={address.id} className={`p-5 border ${address.is_default ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'} rounded-xl relative`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-orange-500" />
                          <h4 className="font-bold text-gray-900">{address.title}</h4>
                          {address.is_default && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          {!address.is_default && (
                            <button title="Set as Default" onClick={() => handleSetDefaultAddress(address.id)} className="text-gray-400 hover:text-orange-500 transition-colors">
                              <FiCheckCircle />
                            </button>
                          )}
                          <button title="Edit" onClick={() => handleEditAddress(address)} className="text-gray-400 hover:text-blue-500 transition-colors">
                            <FiEdit2 />
                          </button>
                          <button title="Delete" onClick={() => handleDeleteAddress(address.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">{address.street_address}</p>
                      <p className="text-gray-600 text-sm">{address.city}, {address.zip_code}</p>
                    </div>
                  ))}
                  {addresses.length === 0 && !showAddressForm && (
                    <p className="text-gray-500 col-span-2 text-center py-8 bg-gray-50 rounded-xl">No saved addresses.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                  <button 
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <FiPlus /> Add New
                  </button>
                </div>
                
                {showPaymentForm && (
                  <form onSubmit={handleSavePayment} className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                    <h3 className="font-bold text-gray-900 mb-4">Add New Card</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Card Type</label>
                        <select value={paymentForm.card_type} onChange={e => setPaymentForm({...paymentForm, card_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500">
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Amex">Amex</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Card Number</label>
                        <input type="text" placeholder="**** **** **** 1234" maxLength="19" onChange={e => setPaymentForm({...paymentForm, last_four_digits: e.target.value.slice(-4)})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
                        <input type="text" placeholder="MM/YY" value={paymentForm.expiry_date} onChange={e => setPaymentForm({...paymentForm, expiry_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">CVC</label>
                        <input type="text" placeholder="***" maxLength="4" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input type="checkbox" checked={paymentForm.is_default} onChange={e => setPaymentForm({...paymentForm, is_default: e.target.checked})} className="text-orange-500 focus:ring-orange-500 rounded" />
                      <span className="text-sm text-gray-700">Set as default payment method</span>
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Save Card</button>
                      <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentMethods.map(payment => (
                    <div key={payment.id} className="p-5 border border-gray-200 rounded-xl relative">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <FiCreditCard className="text-orange-500" />
                          <h4 className="font-bold text-gray-900">{payment.card_type}</h4>
                          {payment.is_default && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <button onClick={() => handleDeletePayment(payment.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <FiTrash2 />
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mt-2">**** **** **** {payment.last_four_digits}</p>
                      <p className="text-gray-500 text-xs mt-1">Expires {payment.expiry_date}</p>
                    </div>
                  ))}
                  {paymentMethods.length === 0 && !showPaymentForm && (
                    <p className="text-gray-500 col-span-2 text-center py-8 bg-gray-50 rounded-xl">No saved payment methods.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h2>
                <form onSubmit={handleSaveSettings}>
                  <div className="space-y-6">
                    <div className="border-b border-gray-100 pb-6">
                      <h3 className="font-bold text-gray-900 mb-4">Notifications</h3>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-500">Receive order updates and promotions via email</p>
                          </div>
                          <input type="checkbox" checked={settings.emailNotifications} onChange={e => setSettings({...settings, emailNotifications: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-medium text-gray-900">SMS Notifications</p>
                            <p className="text-sm text-gray-500">Get text messages for delivery updates</p>
                          </div>
                          <input type="checkbox" checked={settings.smsNotifications} onChange={e => setSettings({...settings, smsNotifications: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500" />
                        </label>
                      </div>
                    </div>
                    
                    <div className="pb-6">
                      <h3 className="font-bold text-gray-900 mb-4">App Preferences</h3>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <p className="font-medium text-gray-900">Dark Theme</p>
                          <p className="text-sm text-gray-500">Switch to dark mode (coming soon)</p>
                        </div>
                        <input type="checkbox" disabled checked={settings.darkTheme} onChange={e => setSettings({...settings, darkTheme: e.target.checked})} className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 opacity-50" />
                      </label>
                    </div>
                    
                    <button type="submit" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors w-full sm:w-auto">
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            )}
            
          </div>
          
        </div>
      </div>
      
      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Review Order #{reviewForm.userOrderNumber}</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReview}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="focus:outline-none"
                    >
                      <FiStar
                        size={28}
                        className={star <= reviewForm.rating ? "fill-orange-400 text-orange-400" : "text-gray-300"}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                <textarea
                  required
                  rows="4"
                  placeholder="What did you like or dislike?"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none text-sm"
                ></textarea>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors text-sm disabled:opacity-70"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Profile;
