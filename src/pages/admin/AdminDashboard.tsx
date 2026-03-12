import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Store, Bike, ShoppingBag, TrendingUp, AlertCircle, Star } from 'lucide-react';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  activeVendors: number;
  activeRiders: number;
  pendingVendors: number;
  pendingRiders: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeVendors: 0,
    activeRiders: 0,
    pendingVendors: 0,
    pendingRiders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [ordersRes, vendorsRes, ridersRes] = await Promise.all([
        supabase.from('orders').select('id, total_price'),
        supabase.from('vendors').select('id, status'),
        supabase.from('riders').select('id, status'),
      ]);

      const orders = (ordersRes.data || []) as { id: string; total_price: number | null }[];
      const vendors = (vendorsRes.data || []) as { id: string; status: string | null }[];
      const riders = (ridersRes.data || []) as { id: string; status: string | null }[];

      setStats({
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + (order.total_price || 0), 0),
        activeVendors: vendors.filter((v) => v.status === 'approved').length,
        activeRiders: riders.filter((r) => r.status === 'approved').length,
        pendingVendors: vendors.filter((v) => v.status === 'pending').length,
        pendingRiders: riders.filter((r) => r.status === 'pending').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'blue',
      onClick: () => navigate('/admin/orders'),
    },
    {
      label: 'Total Revenue',
      value: `₦${stats.totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'green',
      onClick: () => navigate('/admin/orders'),
    },
    {
      label: 'Active Vendors',
      value: stats.activeVendors,
      icon: Store,
      color: 'purple',
      onClick: () => navigate('/admin/vendors'),
    },
    {
      label: 'Active Riders',
      value: stats.activeRiders,
      icon: Bike,
      color: 'orange',
      onClick: () => navigate('/admin/riders'),
    },
    {
      label: 'Pending Vendors',
      value: stats.pendingVendors,
      icon: AlertCircle,
      color: 'red',
      onClick: () => navigate('/admin/vendors'),
    },
    {
      label: 'Pending Riders',
      value: stats.pendingRiders,
      icon: AlertCircle,
      color: 'red',
      onClick: () => navigate('/admin/riders'),
    },
  ];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, Admin</h2>
          <p className="text-gray-600 mt-1">Here's what's happening on your platform today.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left group border border-transparent hover:border-green-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    colorMap[card.color as keyof typeof colorMap]
                  }`}
                >
                  <card.icon className="w-6 h-6" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <Store className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Vendors</h3>
            <p className="text-gray-600">Approve, reject, or view vendor applications</p>
          </button>

          <button
            onClick={() => navigate('/admin/riders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <Bike className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Riders</h3>
            <p className="text-gray-600">Approve or reject rider applications</p>
          </button>

          <button
            onClick={() => navigate('/admin/orders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <ShoppingBag className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">View Orders</h3>
            <p className="text-gray-600">Monitor all platform orders and manage issues</p>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <Users className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-gray-600">View and manage platform users</p>
          </button>

          <button
            onClick={() => navigate('/admin/reviews')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <Star className="w-12 h-12 text-yellow-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Reviews</h3>
            <p className="text-gray-600">Monitor and manage customer reviews</p>
          </button>
        </div>
      </div>
    </div>
  );
}
