import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout, setUser } from '../store/authSlice'
import { setCartCount } from '../store/cartSlice'
import { FiShoppingCart, FiSearch, FiUser } from 'react-icons/fi'
import api from '../api/axios'

const Layout = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const cartCount = useSelector(state => state.cart.count);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      if (!user) {
        api.get('users/profile/')
          .then(res => dispatch(setUser(res.data)))
          .catch(err => {
            console.error('Failed to fetch profile', err);
            dispatch(logout());
          });
      }

      api.get('orders/cart/')
        .then(res => {
          const items = res.data.results || res.data;
          const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
          dispatch(setCartCount(totalCount));
        })
        .catch(err => console.error('Failed to fetch cart', err));
    } else {
      dispatch(setCartCount(0));
    }
  }, [isAuthenticated, user, dispatch]);

  // Close search bar when navigating to a new page
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const profileImageUrl = user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : null;
  const isHomePage = location.pathname === '/';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Premium Dark Navbar */}
      <nav className={`${isHomePage ? 'bg-[#121212]' : 'bg-[#1a1a1a]'} text-white sticky top-0 z-50 border-b border-gray-800 transition-colors`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center font-bold text-white">FC</div>
                <span className="text-xl font-extrabold tracking-tight">FOOD COURT</span>
              </Link>
            </div>
            
            {/* Centered Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-300 hover:text-white'}`}>Home</Link>
              <Link to="/menu" className={`text-sm font-medium transition-colors ${location.pathname === '/menu' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-300 hover:text-white'}`}>Menu</Link>
              <Link to="/about" className={`text-sm font-medium transition-colors ${location.pathname === '/about' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-300 hover:text-white'}`}>About</Link>
              <Link to="/contact" className={`text-sm font-medium transition-colors ${location.pathname === '/contact' ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-300 hover:text-white'}`}>Contact</Link>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-6">
              <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="text-gray-300 hover:text-white transition-colors">
                <FiSearch size={20} />
              </button>
              
              <Link to="/cart" className="text-gray-300 hover:text-orange-500 relative transition-colors">
                <FiShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-orange-600 rounded-full border-2 border-[#1a1a1a]">
                    {cartCount}
                  </span>
                )}
              </Link>
              
              {isAuthenticated ? (
                <Link to="/profile" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex items-center justify-center flex-shrink-0">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-orange-400">{user?.first_name?.[0] || 'U'}</span>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium">Login</Link>
                  <Link to="/register" className="bg-orange-600 text-white hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
          
          {isSearchOpen && (
            <div className="pb-4 pt-2">
              <form onSubmit={handleSearchSubmit} className="relative max-w-lg mx-auto">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search for food, categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors">
                  <FiSearch size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-[1400px] mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <span className="text-2xl font-extrabold text-orange-500">FoodCourt</span>
              <p className="mt-4 text-gray-400 max-w-sm">Delivering the best culinary experiences right to your doorstep. Fast, fresh, and delicious.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Quick Links</h3>
              <ul className="mt-4 space-y-4">
                <li><Link to="/menu" className="text-base text-gray-400 hover:text-white">Menu</Link></li>
                <li><Link to="/about" className="text-base text-gray-400 hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="text-base text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">Legal</h3>
              <ul className="mt-4 space-y-4">
                <li><a href="#" className="text-base text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="text-base text-gray-400 hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 flex justify-between items-center">
            <p className="text-sm text-gray-500">&copy; 2026 FoodCourt. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout;
