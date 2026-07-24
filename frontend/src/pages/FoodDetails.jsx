import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import api from '../api/axios';
import { incrementCartCount } from '../store/cartSlice';
import { FiArrowLeft, FiHeart, FiStar, FiTruck, FiShield, FiThumbsUp, FiBox } from 'react-icons/fi';
import { useTracker } from '../hooks/useTracker';

const FoodDetails = () => {
  const { trackEvent } = useTracker();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const [food, setFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState(null);

  useEffect(() => {
    const fetchFoodDetails = async () => {
      try {
        const response = await api.get(`foods/menu/${id}/`);
        setFood(response.data);
        trackEvent('food_view', { foodId: response.data.id });

        if (isAuthenticated) {
          const wlRes = await api.get('orders/wishlist/');
          const item = wlRes.data.results?.find(w => w.food === parseInt(id)) || wlRes.data?.find(w => w.food === parseInt(id));
          if (item) {
            setInWishlist(true);
            setWishlistId(item.id);
          }
        }
      } catch (error) {
        console.error('Error fetching food details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFoodDetails();
  }, [id, isAuthenticated]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await api.post('orders/cart/', {
        food: food.id,
        quantity: quantity,
        size: selectedSize
      });
      dispatch(incrementCartCount(quantity));
      trackEvent('add_to_cart', { foodId: food.id });
      // Toast notification could go here
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/cart');
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (inWishlist && wishlistId) {
        await api.delete(`orders/wishlist/${wishlistId}/`);
        setInWishlist(false);
        setWishlistId(null);
      } else {
        const res = await api.post('orders/wishlist/', { food: food.id });
        if (res.data) {
          setInWishlist(true);
          setWishlistId(res.data.id);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse bg-white p-8 rounded-2xl w-full max-w-5xl h-96"></div></div>;
  if (!food) return <div className="min-h-screen flex items-center justify-center text-red-500 bg-gray-50">Food not found.</div>;

  const imageUrl = food.image ? (food.image.startsWith('http') ? food.image : `http://localhost:8000${food.image}`) : null;

  const avgRating = food.reviews?.length > 0
    ? (food.reviews.reduce((acc, r) => acc + r.rating, 0) / food.reviews.length).toFixed(1)
    : '4.6';
  const reviewsCount = food.reviews?.length || 120;

  const displayPrice = food ? (parseFloat(food.price) * (selectedSize === 'Small' ? 0.8 : selectedSize === 'Large' ? 1.2 : 1)).toFixed(2) : 0;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <Link to="/menu" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-medium transition-colors">
          <FiArrowLeft /> Back to Menu
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col lg:flex-row">

          {/* Left: Image / 3D Container */}
          <div className="lg:w-[45%] bg-gray-100 relative p-8 flex items-center justify-center min-h-[400px]">

            {imageUrl ? (
              <img src={imageUrl} alt={food.name} className={`w-full h-auto max-h-[500px] object-contain drop-shadow-2xl rounded-2xl relative z-10 ${!food.is_available ? 'opacity-70 grayscale-[0.3]' : ''}`} />
            ) : (
              <div className="w-full h-96 flex items-center justify-center text-gray-400 relative z-10">No Image</div>
            )}

            {!food.is_available && (
              <div className="absolute top-6 left-6 bg-red-500/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center gap-2 z-20">
                OUT OF STOCK
              </div>
            )}

            <button
              onClick={handleToggleWishlist}
              className={`absolute bottom-6 right-6 w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-sm z-20 ${inWishlist ? 'bg-orange-50 text-red-500' : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'}`}
            >
              <FiHeart size={24} className={inWishlist ? 'fill-red-500' : ''} />
            </button>
          </div>

          {/* Right: Details Container */}
          <div className="lg:w-[55%] p-8 lg:p-12 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">{food.name}</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                In Stock
              </span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center text-orange-500">
                <FiStar className="fill-orange-500" />
                <span className="ml-1 font-bold">{avgRating}</span>
              </div>
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 text-sm">({reviewsCount} reviews)</span>
            </div>

            <p className="text-3xl font-extrabold text-gray-900 mb-4">${displayPrice}</p>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">{food.description}</p>

            {/* Size Selector */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Size</h3>
              <div className="flex gap-3">
                {['Small', 'Medium', 'Large'].map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${selectedSize === size
                        ? 'border-2 border-orange-500 text-orange-600 bg-orange-50'
                        : 'border border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-center gap-4">

                {/* Quantity */}
                <div className="w-full sm:w-auto flex items-center justify-between border border-gray-200 rounded-xl px-2 py-1 bg-gray-50">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xl font-medium rounded-lg hover:bg-gray-200 transition-colors">-</button>
                  <span className="w-10 text-center font-bold text-gray-900">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xl font-medium rounded-lg hover:bg-gray-200 transition-colors">+</button>
                </div>

                {/* Action Buttons */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !food.is_available}
                  className={`flex-1 w-full py-3.5 rounded-xl font-bold transition-all shadow-sm ${food.is_available ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  {!food.is_available ? 'Out of Stock' : (addingToCart ? 'Adding...' : 'Add to Cart')}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!food.is_available}
                  className={`flex-1 w-full py-3 rounded-xl font-bold transition-colors border-2 ${food.is_available ? 'bg-white border-orange-500 text-orange-600 hover:bg-orange-50' : 'bg-white border-gray-300 text-gray-400 cursor-not-allowed'}`}
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Features list */}
            <div className="mt-8 grid grid-cols-3 gap-4 py-6 border-t border-b border-gray-100">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FiTruck /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Fast Delivery</p>
                  <p className="text-[10px] text-gray-500">30-40 min</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FiThumbsUp /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Best Quality</p>
                  <p className="text-[10px] text-gray-500">Fresh & Tasty</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FiShield /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Secure Payment</p>
                  <p className="text-[10px] text-gray-500">100% Safe</p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Reviews ({reviewsCount})</h3>

              {food.reviews?.length > 0 ? (
                <div className="space-y-6">
                  {food.reviews.map(review => (
                    <div key={review.id} className="flex gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <span className="text-gray-500 font-bold">{review.user_name?.[0] || 'U'}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-sm text-gray-900">{review.user_name || 'Anonymous'}</h4>
                          <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex text-orange-400 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <FiStar key={i} className={i < review.rating ? "fill-orange-400" : "text-gray-300"} size={12} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{review.comment || 'Amazing food! Loved the taste and quality.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                    <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-sm text-gray-900">John Doe</h4>
                      <span className="text-xs text-gray-400">2 days ago</span>
                    </div>
                    <div className="flex text-orange-400 mb-2">
                      <FiStar className="fill-orange-400" size={12} />
                      <FiStar className="fill-orange-400" size={12} />
                      <FiStar className="fill-orange-400" size={12} />
                      <FiStar className="fill-orange-400" size={12} />
                      <FiStar className="fill-orange-400" size={12} />
                    </div>
                    <p className="text-sm text-gray-600">Amazing pizza! Loved the taste and quality.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodDetails;
