import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { useDispatch } from 'react-redux';
import { decrementCartCount } from '../store/cartSlice';
import api from '../api/axios';
import { useTracker } from '../hooks/useTracker';

const Cart = () => {
  const { trackEvent } = useTracker();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    fetchCart();
    trackEvent('cart_view');
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('orders/cart/');
      setCartItems(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (item) => {
    try {
      await api.delete(`orders/cart/${item.id}/`);
      setCartItems(cartItems.filter(cartItem => cartItem.id !== item.id));
      dispatch(decrementCartCount(item.quantity));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const calculateItemPrice = (item) => {
    const base = parseFloat(item.food_details.price);
    if (item.size === 'Small') return base * 0.8;
    if (item.size === 'Large') return base * 1.2;
    return base;
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (calculateItemPrice(item) * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 5.00 : 0;
  const total = subtotal + deliveryFee;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <Link to="/menu" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <FiArrowLeft /> Back to Menu
        </Link>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>
        
        {cartItems.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="bg-white shadow rounded-xl overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <li key={item.id} className="p-6 flex items-center gap-6">
                      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                        {item.food_details.image ? (
                           <img src={item.food_details.image} alt={item.food_details.name} className="h-full w-full object-cover object-center" />
                        ) : (
                           <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between ml-6">
                        <div>
                          <div className="flex justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                              <Link to={`/menu/${item.food_details.id}`}>{item.food_details.name}</Link>
                            </h3>
                            <p className="text-lg font-bold text-gray-900">${(calculateItemPrice(item) * item.quantity).toFixed(2)}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.food_details.category_name} &bull; <span className="font-semibold text-gray-700">Size: {item.size || 'Medium'}</span>
                          </p>
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <p className="text-gray-500 text-sm">Qty {item.quantity}</p>
                          <button onClick={() => handleRemove(item)} type="button" className="font-medium text-red-600 hover:text-red-500 flex items-center gap-1 text-sm">
                            <FiTrash2 /> Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="w-full lg:w-96">
              <div className="bg-white shadow rounded-xl p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
                <div className="flow-root">
                  <dl className="-my-4 text-sm divide-y divide-gray-200">
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-gray-600">Subtotal</dt>
                      <dd className="font-medium text-gray-900">${subtotal.toFixed(2)}</dd>
                    </div>
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-gray-600">Delivery Fee</dt>
                      <dd className="font-medium text-gray-900">${deliveryFee.toFixed(2)}</dd>
                    </div>
                    <div className="py-4 flex items-center justify-between">
                      <dt className="text-base font-medium text-gray-900">Order total</dt>
                      <dd className="text-base font-bold text-orange-600">${total.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/checkout', { state: { subtotal, deliveryFee, total } })}
                    className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl shadow">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">Looks like you haven't added any food to your cart yet.</p>
            <Link to="/menu" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700">
              Explore Menu
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
