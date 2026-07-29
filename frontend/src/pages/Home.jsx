import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiTruck, FiShoppingBag, FiCreditCard, FiHeadphones, FiHeart, FiStar } from 'react-icons/fi';
import api from '../api/axios';
import { incrementCartCount } from '../store/cartSlice';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const { isAuthenticated } = useSelector(state => state.auth || { isAuthenticated: false });
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('foods/categories/');
        const catData = catRes.data?.results || catRes.data;
        setCategories(Array.isArray(catData) ? catData.slice(0, 6) : []);
        
        // Fetch featured or just some random foods for best sellers
        const foodRes = await api.get('foods/menu/');
        const foodData = foodRes.data?.results || foodRes.data;
        setBestSellers(Array.isArray(foodData) ? foodData.slice(0, 4) : []);
        
        if (isAuthenticated) {
          const wlRes = await api.get('orders/wishlist/');
          setWishlistItems(wlRes.data.results || wlRes.data || []);
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  const handleToggleWishlist = async (e, foodId) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please log in to manage your wishlist.');
      return;
    }
    
    const existingItem = wishlistItems.find(w => w.food === foodId);
    try {
      if (existingItem) {
        await api.delete(`orders/wishlist/${existingItem.id}/`);
        setWishlistItems(wishlistItems.filter(w => w.id !== existingItem.id));
      } else {
        const response = await api.post('orders/wishlist/', { food: foodId });
        if (response.data) {
          setWishlistItems([...wishlistItems, response.data]);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    }
  };

  const getAvgRating = (food) => {
    if (food.reviews?.length > 0) {
      const sum = food.reviews.reduce((acc, r) => acc + r.rating, 0);
      return (sum / food.reviews.length).toFixed(1);
    }
    return '4.6';
  };

  const heroImageUrl = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-1.2.1&auto=format&fit=crop&w=1050&q=80";

  return (
    <div className="bg-gray-50 min-h-screen">
      
      {/* Hero Section */}
      <div className="bg-[#121212] relative overflow-hidden text-white pt-10 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6">
              Delicious Food <br /> Delivered Fast
            </h1>
            <p className="text-gray-400 text-lg lg:text-xl mb-10 max-w-lg mx-auto lg:mx-0">
              Choose your favorite food from hundreds of options and enjoy!
            </p>
            <button onClick={() => navigate('/menu')} className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all">
              Order Now
            </button>
          </div>
          <div className="lg:w-1/2 relative flex justify-center">
            {/* Soft glow behind the plate */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[100px] rounded-full"></div>
            <img src={heroImageUrl} alt="Delicious Food" className="w-[80%] max-w-[600px] h-auto object-cover rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 aspect-square" />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* Features Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 flex-shrink-0"><FiTruck size={20} /></div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Fast Delivery</h4>
                <p className="text-xs text-gray-500 mt-0.5">On time, every time</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 flex-shrink-0"><FiShoppingBag size={20} /></div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Best Quality</h4>
                <p className="text-xs text-gray-500 mt-0.5">Fresh & tasty food</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 flex-shrink-0"><FiCreditCard size={20} /></div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Easy Payments</h4>
                <p className="text-xs text-gray-500 mt-0.5">Secure & simple</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 flex-shrink-0"><FiHeadphones size={20} /></div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">24/7 Support</h4>
                <p className="text-xs text-gray-500 mt-0.5">We're here for you</p>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Categories */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popular Categories</h2>
            <Link to="/menu" className="text-orange-500 font-medium hover:text-orange-600 text-sm">View All</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, idx) => {
              const emojis = ['🍕', '🍔', '🍛', '🍜', '🍰', '🥤'];
              const emoji = emojis[idx % emojis.length];
              return (
                <Link to={`/menu?category=${cat.id}`} key={cat.id} className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-3xl">
                    {emoji}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Best Sellers</h2>
            <Link to="/menu" className="text-orange-500 font-medium hover:text-orange-600 text-sm">View All</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map(food => {
              const imageUrl = food.image ? (food.image.startsWith('http') ? food.image : `http://localhost:8000${food.image}`) : null;
              const inWishlist = wishlistItems.some(w => w.food === food.id);
              
              return (
                <Link to={`/menu/${food.id}`} key={food.id} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
                  <div className="h-44 bg-gray-100 relative overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                    )}
                    <button 
                      onClick={(e) => handleToggleWishlist(e, food.id)}
                      className={`absolute top-3 right-3 w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${inWishlist ? 'bg-orange-50 text-red-500' : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'}`}
                    >
                      <FiHeart size={16} className={inWishlist ? 'fill-red-500' : ''} />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-2">{food.name}</h3>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-lg font-bold text-gray-900">${food.price}</span>
                      <div className="flex items-center gap-1 text-sm">
                        <FiStar className="text-orange-400 fill-orange-400" size={14} />
                        <span className="font-medium text-gray-700">{getAvgRating(food)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="bg-[#121212] rounded-3xl p-10 md:p-14 mb-16 flex flex-col md:flex-row items-center justify-between text-white border border-gray-800 shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-orange-500/10 to-transparent opacity-50"></div>
          <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-3xl font-bold text-orange-500 mb-2">Get 20% OFF</h2>
            <p className="text-xl text-gray-300">On your first order</p>
          </div>
          <button onClick={() => navigate('/menu')} className="relative z-10 bg-gradient-to-r from-orange-400 to-orange-600 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all flex-shrink-0">
            Order Now
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;
