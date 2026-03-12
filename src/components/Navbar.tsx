import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, Utensils, Bike, User, ShoppingBag } from 'lucide-react';

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const getDashboardLink = () => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard };
      case 'vendor':
        return { label: 'Vendor Dashboard', path: '/vendor', icon: Utensils };
      case 'rider':
        return { label: 'Rider Dashboard', path: '/rider', icon: Bike };
      case 'customer':
        return { label: 'My Orders', path: '/orders', icon: ShoppingBag };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-green-600 flex items-center gap-2"
            >
              <Utensils className="w-8 h-8" />
              <span>CIKIEats</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {dashboardLink && (
              <button
                onClick={() => navigate(dashboardLink.path)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 transition"
              >
                <dashboardLink.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{dashboardLink.label}</span>
              </button>
            )}

            <div className="h-6 w-px bg-gray-200 mx-2" />

            <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 truncate max-w-[100px] sm:max-w-none">
                {user.email}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
