import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { setCartCount } from '../store/cartSlice';
import api from '../api/axios';
import { useTracker } from '../hooks/useTracker';

const Checkout = () => {
  const { trackEvent } = useTracker();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { subtotal, deliveryFee, total } = location.state || { subtotal: 0, deliveryFee: 0, total: 0 };
  
  const [formData, setFormData] = useState({
    address: '',
    payment_method: 'Credit Card'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If no state, redirect to cart
  useEffect(() => {
    if (total === 0) {
      navigate('/cart');
    } else {
      trackEvent('checkout_start');
    }
  }, [total, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    trackEvent('payment_attempt');

    try {
      const response = await api.post('orders/', {
        address: formData.address,
        payment_method: formData.payment_method,
        delivery_fee: deliveryFee,
        discount: 0
      });
      // Clear global cart count
      dispatch(setCartCount(0));
      
      trackEvent('payment_success', { extra: { orderId: response.data.id, total } });
      
      // Redirect to profile orders
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setError('Failed to place order. Please try again.');
      trackEvent('payment_failure', { extra: { reason: err.response?.data?.detail || err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Link to="/cart" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <FiArrowLeft /> Back to Cart
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <form onSubmit={handlePlaceOrder} className="bg-white shadow rounded-xl p-6 space-y-6">
              {error && <div className="text-red-500 bg-red-50 p-3 rounded">{error}</div>}
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Address</h3>
                <textarea
                  name="address"
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter your full delivery address"
                  value={formData.address}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                <select
                  name="payment_method"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={formData.payment_method}
                  onChange={handleChange}
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                {loading ? 'Processing...' : `Place Order ($${total.toFixed(2)})`}
              </button>
            </form>
          </div>
          
          <div className="w-full md:w-80">
            <div className="bg-white shadow rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              <dl className="-my-4 text-sm divide-y divide-gray-200">
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="font-medium text-gray-900">${subtotal.toFixed(2)}</dd>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-gray-600">Delivery</dt>
                  <dd className="font-medium text-gray-900">${deliveryFee.toFixed(2)}</dd>
                </div>
                <div className="py-4 flex items-center justify-between">
                  <dt className="text-base font-bold text-gray-900">Total</dt>
                  <dd className="text-base font-bold text-orange-600">${total.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
