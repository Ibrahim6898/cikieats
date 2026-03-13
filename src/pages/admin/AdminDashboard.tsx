import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Store, Bike, ShoppingBag, TrendingUp, AlertCircle, Settings } from 'lucide-react';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  activeVendors: number;
  activeRiders: number;
  pendingVendors: number;
  pendingRiders: number;
  totalUsers: number;
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
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [ordersRes, vendorsRes, ridersRes, usersRes] = await Promise.all([
        supabase.from('orders').select('id, total_price'),
        supabase.from('vendors').select('id, status'),
        supabase.from('riders').select('id, status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
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
        totalUsers: usersRes.count || 0,
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
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'green',
      onClick: () => navigate('/admin/users'),
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
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">
              Control <span className="text-green-600">Hub</span>
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Platform Overview — Operational Center</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => navigate('/admin/settings')} className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition border border-gray-100">
                <Settings className="w-5 h-5 text-gray-600" />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-12">
          <h2 className="text-5xl font-black text-gray-900 tracking-tight leading-none mb-3">
            Welcome back, <br />Administrator
          </h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm font-bold text-gray-500">System Live — All parameters nominal.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {statCards.map((card) => (
            <button
              key={card.label}
              onClick={card.onClick}
              className="glass-card rounded-[40px] p-8 premium-shadow hover-scale text-left relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <card.icon className="w-24 h-24" />
              </div>
              
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 group-hover:text-green-600 transition-colors">
                    {card.label}
                  </p>
                  <p className="text-4xl font-black text-gray-900 tracking-tighter">
                    {card.value}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${colorMap[card.color as keyof typeof colorMap]}`}>
                  <card.icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                View Details <TrendingUp className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <button
            onClick={() => navigate('/admin/vendors')}
            className="glass-card rounded-[40px] p-10 premium-shadow hover-scale text-left border border-white/50"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-8 border border-purple-100">
               <Store className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Vendors</h3>
            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Approve & Review Applications</p>
          </button>

          <button
            onClick={() => navigate('/admin/riders')}
            className="glass-card rounded-[40px] p-10 premium-shadow hover-scale text-left border border-white/50"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-8 border border-orange-100">
               <Bike className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Riders</h3>
            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Logistics & Courier Oversight</p>
          </button>

          <button
            onClick={() => navigate('/admin/orders')}
            className="glass-card rounded-[40px] p-10 premium-shadow hover-scale text-left border border-white/50"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 border border-blue-100">
               <ShoppingBag className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Orders</h3>
            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Live Monitoring & Support</p>
          </button>

          <button
            onClick={() => navigate('/admin/users')}
            className="glass-card rounded-[40px] p-10 premium-shadow hover-scale text-left border border-white/50"
          >
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-8 border border-green-100">
               <Users className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Users</h3>
            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-widest">Base Accounts Management</p>
          </button>
        </div>
      </div>
    </div>
  );
}
