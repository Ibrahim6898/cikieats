import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Banknote, TrendingUp } from 'lucide-react';

interface Delivery {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  vendors: {
    restaurant_name: string;
  };
}

export function RiderEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averagePerDelivery: 0,
  });

  useEffect(() => {
    if (user) {
      fetchRiderData();
    }
  }, [user]);

  const fetchRiderData = async () => {
    if (!user) return;
    try {
      const { data: riderData } = await (supabase
        .from('riders') as any)
        .select('id, deliveries_completed, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (riderData) {
        // Security Guard: Redirect if not approved
        if (riderData.status !== 'approved') {
          navigate('/rider');
          return;
        }

        const { data: ordersData, error: ordersError } = await (supabase
          .from('orders') as any)
          .select(`
            *,
            vendors(restaurant_name),
            payout:payouts(amount)
          `)
          .eq('rider_id', riderData.id)
          .eq('status', 'delivered')
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const { data: payoutsTotalData, error: payoutsTotalError } = await supabase
          .from('payouts')
          .select('amount')
          .eq('user_id', user.id)
          .eq('role', 'rider');

        if (payoutsTotalError) throw payoutsTotalError;

        const deliveredOrders = (ordersData || []) as any[];
        // Extract the payout amount if it exists (Supabase returns an array for the join if not single, but should be single here)
        deliveredOrders.forEach(order => {
            if (order.payout && Array.isArray(order.payout)) {
                order.payout = order.payout[0];
            }
        });

        const totalEarnings = (payoutsTotalData as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0);

        setDeliveries(deliveredOrders as Delivery[]);
        setStats({
          totalDeliveries: riderData.deliveries_completed,
          totalEarnings: totalEarnings,
          averagePerDelivery: deliveredOrders.length > 0 ? totalEarnings / deliveredOrders.length : 0,
        });
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
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

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="navbar-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/rider')}
              className="group flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-gray-100 text-gray-600 hover:text-gray-900 transition-all premium-shadow active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Dashboard</span>
            </button>
            <div className="text-right">
               <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Earnings</h1>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Financial Overview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="glass-card rounded-[32px] p-8 premium-shadow hover:scale-[1.02] transition-transform duration-300 border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-green-50 rounded-2xl">
                <Banknote className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payout</p>
            </div>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Total Earnings</p>
            <p className="text-4xl font-black text-green-600 tracking-tighter">{getSetting('currency_symbol', '₦')}{stats.totalEarnings.toFixed(2)}</p>
          </div>

          <div className="glass-card rounded-[32px] p-8 premium-shadow hover:scale-[1.02] transition-transform duration-300 border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth</p>
            </div>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Total Deliveries</p>
            <p className="text-4xl font-black text-blue-600 tracking-tighter">{stats.totalDeliveries}</p>
          </div>

          <div className="glass-card rounded-[32px] p-8 premium-shadow hover:scale-[1.02] transition-transform duration-300 border border-white/50">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-orange-50 rounded-2xl">
                <Banknote className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency</p>
            </div>
            <p className="text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Avg per Delivery</p>
            <p className="text-4xl font-black text-orange-600 tracking-tighter">{getSetting('currency_symbol', '₦')}{stats.averagePerDelivery.toFixed(2)}</p>
          </div>
        </div>

        <div className="glass-card rounded-[40px] premium-shadow border border-white/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Delivery History</h2>
            <div className="p-2 bg-gray-50 rounded-xl">
               <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-20 text-center">
               <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <Banknote className="w-10 h-10 text-gray-200" />
               </div>
               <p className="text-gray-400 font-black uppercase tracking-widest">No deliveries completed yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {deliveries.map((delivery) => {
                // Note: In an ideal world we'd join payouts into the orders query
                // but for now we'll match by order_id if available or just show the recorded amount
                // Since our payouts table uses order_id, we should utilize it.
                return (
                  <div key={delivery.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 group-hover:rotate-3 transition-transform">
                         <Banknote className="w-8 h-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{(delivery as any).vendors?.restaurant_name || 'Restaurant'}</h3>
                        <p className="text-xs font-bold text-gray-500">
                          {new Date(delivery.created_at).toLocaleDateString()} at {new Date(delivery.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl text-green-600 tracking-tighter">
                        +{getSetting('currency_symbol', '₦')}{(delivery as any).payout?.amount?.toFixed(2) || (Number(delivery.total_price) * 0.1).toFixed(2)}
                      </p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">
                        { (delivery as any).payout ? 'Verified Payout' : 'Estimated (10%)' }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
