import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { incrementCartCount } from '../store/cartSlice';
import { FiSearch, FiFilter, FiShoppingCart, FiStar, FiChevronDown, FiHeart } from 'react-icons/fi';
import { useTracker } from '../hooks/useTracker';

const Menu = () => {
  const { trackEvent } = useTracker();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [priceRange, setPriceRange] = useState(200);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const { isAuthenticated } = useSelector((state) => state.auth || { isAuthenticated: false });
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    fetchCategories();
    
    const queryParams = new URLSearchParams(location.search);
    const urlSearch = queryParams.get('search') || '';
    setSearch(urlSearch);
    
    fetchFoods(urlSearch, selectedCategory);
    
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, location.search]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('foods/categories/');
      const data = response.data?.results || response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFoods = async (searchQuery = '', category = '') => {
    setLoading(true);
    try {
      let url = 'foods/menu/?';
      if (searchQuery) url += `search=${searchQuery}&`;
      if (category) url += `category=${category}&`;
      
      const response = await api.get(url);
      const data = response.data?.results || response.data;
      setFoods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await api.get('orders/wishlist/');
      const data = response.data?.results || response.data;
      setWishlistItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    trackEvent('search', { searchTerm: search, extra: { resultCount: processedFoods.length } });
    fetchFoods(search, selectedCategory);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    trackEvent('category_click', { categoryId });
    fetchFoods(search, categoryId);
  };

  const handleAddToCart = async (e, food) => {
    e.preventDefault(); // Prevent navigating to details page
    e.stopPropagation(); // Stop event from bubbling to the Link
    try {
      await api.post('orders/cart/', {
        food: food.id,
        quantity: 1,
        size: 'Medium'
      });
      dispatch(incrementCartCount(1));
      trackEvent('add_to_cart', { foodId: food.id });
      alert(`${food.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 401) {
        alert('Please log in to add items to your cart.');
      }
    }
  };

  const handleToggleWishlist = async (e, foodId) => {
    e.preventDefault(); // Prevent navigating
    e.stopPropagation(); // Stop event bubbling
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
    return '4.5';
  };

  const processedFoods = foods.filter(food => {
    const price = parseFloat(food.price);
    const rating = parseFloat(getAvgRating(food));
    if (price > priceRange) return false;
    if (minRating > 0 && rating < minRating) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === 'price_desc') return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === 'rating_desc') return parseFloat(getAvgRating(b)) - parseFloat(getAvgRating(a));
    return 0;
  });

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
        
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-white rounded-2xl p-6 border border-gray-100 hidden md:block h-fit sticky top-24">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Categories</h2>
            <ul className="space-y-1">
              <li>
                <button 
                  onClick={() => handleCategoryFilter('')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${selectedCategory === '' ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs">🥘</span> All
                </button>
              </li>
              {categories.map((cat, idx) => {
                const emojis = ['🍕', '🍔', '🍛', '🍜', '🍰', '🥤', '🍟', '🥗'];
                const emoji = emojis[idx % emojis.length];
                return (
                  <li key={cat.id}>
                    <button 
                      onClick={() => handleCategoryFilter(cat.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center gap-3 text-sm font-medium ${selectedCategory === cat.id ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs">{emoji}</span> {cat.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Filters</h2>
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 mb-3">Price</p>
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span>$0</span>
                <span className="font-bold text-orange-600">${priceRange}</span>
                <span>$200+</span>
              </div>
              <input 
                type="range" 
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                min="0" max="200" 
                value={priceRange} 
                onChange={(e) => setPriceRange(e.target.value)} 
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">Rating</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rating" onChange={() => setMinRating(0)} defaultChecked className="text-orange-500 focus:ring-orange-500 border-gray-300 w-4 h-4" />
                  <span className="text-sm text-gray-600">All Ratings</span>
                </label>
                {[4, 3, 2].map(rating => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="rating" onChange={() => setMinRating(rating)} className="text-orange-500 focus:ring-orange-500 border-gray-300 w-4 h-4" />
                    <span className="text-sm text-gray-600 flex items-center">{rating}★ & above</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors">
            Apply Filters
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
            <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search for food, category..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </form>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative group">
                <button className="flex justify-between items-center w-40 gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none">
                  <span className="truncate">
                    {sortBy === 'price_asc' ? 'Price: Low to High' : 
                     sortBy === 'price_desc' ? 'Price: High to Low' : 
                     sortBy === 'rating_desc' ? 'Top Rated' : 'Sort By'}
                  </span>
                  <FiChevronDown className="transition-transform group-hover:rotate-180 flex-shrink-0" />
                </button>
                
                {/* Invisible wrapper area to prevent losing hover when moving mouse down */}
                <div className="absolute right-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden py-1 flex flex-col">
                    <button 
                      onClick={() => setSortBy('')} 
                      className={`text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${sortBy === '' ? 'font-bold text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
                    >
                      Default
                    </button>
                    <button 
                      onClick={() => setSortBy('price_asc')} 
                      className={`text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'price_asc' ? 'font-bold text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
                    >
                      Price: Low to High
                    </button>
                    <button 
                      onClick={() => setSortBy('price_desc')} 
                      className={`text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'price_desc' ? 'font-bold text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
                    >
                      Price: High to Low
                    </button>
                    <button 
                      onClick={() => setSortBy('rating_desc')} 
                      className={`text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'rating_desc' ? 'font-bold text-orange-500 bg-orange-50/50' : 'text-gray-700'}`}
                    >
                      Top Rated
                    </button>
                  </div>
                </div>
              </div>
              <button className="p-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors md:hidden">
                <FiFilter />
              </button>
            </div>
          </div>

          {/* Food Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="animate-pulse bg-white rounded-2xl h-72 border border-gray-100"></div>
              ))}
            </div>
          ) : processedFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedFoods.map(food => {
                const imageUrl = food.image 
                  ? (food.image.startsWith('http') ? food.image : `http://localhost:8000${food.image}`) 
                  : null;
                const inWishlist = wishlistItems.some(w => w.food === food.id);
                
                return (
                  <Link to={`/menu/${food.id}`} key={food.id} onClick={() => trackEvent('food_click', { foodId: food.id })} className={`group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col ${!food.is_available ? 'opacity-70' : ''}`}>
                    <div className="h-44 bg-gray-100 relative overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}

                      {!food.is_available && (
                        <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm flex items-center gap-1 z-10">
                          OUT OF STOCK
                        </div>
                      )}

                      <button 
                        onClick={(e) => handleToggleWishlist(e, food.id)}
                        className={`absolute top-3 right-3 w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${inWishlist ? 'bg-orange-50 text-red-500' : 'bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white'}`}
                      >
                        <FiHeart size={16} className={inWishlist ? 'fill-red-500' : ''} />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1">{food.name}</h3>
                      <div className="flex justify-between items-center mt-1 mb-4">
                        <span className="text-lg font-bold text-gray-900">${food.price}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto">
                        <div className="flex items-center gap-1 text-sm">
                          <FiStar className="text-orange-400 fill-orange-400" size={14} />
                          <span className="font-medium text-gray-700">{getAvgRating(food)}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            if (food.is_available) {
                              handleAddToCart(e, food);
                            } else {
                              e.preventDefault();
                            }
                          }}
                          disabled={!food.is_available}
                          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${food.is_available ? 'bg-white border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-200'}`}
                        >
                          {food.is_available ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-lg font-medium text-gray-900">No foods found</p>
              <p className="text-gray-500 mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Menu;
