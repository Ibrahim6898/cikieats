import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, Utensils, Bike, ShoppingBag, Settings } from 'lucide-react';

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
    <nav className="glass-card sticky top-0 z-50 px-4 sm:px-6 lg:px-8 mx-4 mt-4 rounded-2xl border-white/40 shadow-2xl shadow-black/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="text-2xl font-black text-green-600 flex items-center gap-2 hover-scale transition-all"
            >
              <div className="bg-green-600 p-1.5 rounded-xl shadow-lg shadow-green-200">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <span className="tracking-tight">CIKIEats</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {dashboardLink && (
              <button
                onClick={() => navigate(dashboardLink.path)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all hover-scale"
              >
                <dashboardLink.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{dashboardLink.label}</span>
              </button>
            )}

            <div className="h-4 w-px bg-gray-200/50 mx-1" />

            <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-gray-50/50 rounded-xl border border-white/50 premium-shadow">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-600">
                {user.email}
              </span>
            </div>

            {role === 'admin' && (
              <button
                onClick={() => navigate('/admin/settings')}
                className="p-2.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all hover-scale"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover-scale"
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
