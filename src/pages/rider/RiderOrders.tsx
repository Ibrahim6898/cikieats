import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MapPin, Phone, CheckCircle, Truck, XCircle, History, Package } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  phone: string;
  total_price: number;
  rider_id: string | null;
  created_at: string;
  riders: {
    is_online: boolean;
  } | null;
  vendors: {
    restaurant_name: string;
  };
  profiles: {
    name: string;
  };
}

const deliverySteps = [
  { key: 'ready', label: 'Accepted' },
  { key: 'picked_up', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

function getStepIndex(status: string) {
  return deliverySteps.findIndex((s) => s.key === status);
}

export function RiderOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [dropping, setDropping] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRiderAndOrders();
      const cleanup = subscribeToOrders();
      return cleanup;
    }
  }, [user]);

  const fetchRiderAndOrders = async () => {
    if (!user) return;
    try {
      const { data: riderData } = await (supabase
        .from('riders') as any)
        .select('id, is_online, status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!riderData) return;
      
      // Security Guard: Redirect if not approved
      if (riderData.status !== 'approved') {
        navigate('/rider');
        return;
      }

      setRiderId(riderData.id);
      setIsOnline(riderData.is_online);

      const baseSelect = `
        *,
        riders(is_online),
        vendors(restaurant_name),
        profiles!orders_customer_id_fkey(name)
      `;

      // Active: unassigned ready orders OR my picked_up/on_the_way orders
      const [{ data: availableData }, { data: myActiveData }, { data: historyData }] =
        await Promise.all([
          riderData.is_online
            ? (supabase.from('orders') as any)
                .select(baseSelect)
                .eq('status', 'ready')
                .is('rider_id', null)
                .order('created_at', { ascending: false })
            : { data: [] },
          (supabase.from('orders') as any)
            .select(baseSelect)
            .eq('rider_id', riderData.id)
            .in('status', ['picked_up', 'on_the_way'])
            .order('created_at', { ascending: false }),
          (supabase.from('orders') as any)
            .select(baseSelect)
            .eq('rider_id', riderData.id)
            .eq('status', 'delivered')
            .order('created_at', { ascending: false }),
        ]);

      const combined = [...(myActiveData || []), ...(availableData || [])];
      setActiveOrders(combined);
      setHistoryOrders(historyData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel('rider_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { fetchRiderAndOrders(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const acceptOrder = async (orderId: string) => {
    if (!riderId) return;
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ rider_id: riderId }) // Status stays 'ready'
        .eq('id', orderId);
      if (error) throw error;
      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const markPickedUp = async (orderId: string) => {
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ status: 'picked_up' })
        .eq('id', orderId);
      if (error) throw error;
      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const completeDelivery = async (orderId: string) => {
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ status: 'delivered' })
        .eq('id', orderId);
      if (error) throw error;

      if (riderId) {
        const { data: rider } = await (supabase.from('riders') as any)
          .select('deliveries_completed')
          .eq('id', riderId)
          .maybeSingle();
        if (rider) {
          await (supabase.from('riders') as any)
            .update({ deliveries_completed: (rider.deliveries_completed || 0) + 1 })
            .eq('id', riderId);
        }
      }
      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error completing delivery:', error);
    }
  };

  const dropOrder = async (orderId: string) => {
    setDropping(orderId);
    try {
      const { error } = await (supabase.from('orders') as any)
        .update({ rider_id: null, status: 'ready' })
        .eq('id', orderId);
      if (error) throw error;
      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error dropping order:', error);
    } finally {
      setDropping(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const renderOrderCard = (order: Order) => {
    const isMyOrder = order.rider_id === riderId;
    const stepIndex = getStepIndex(order.status);

    return (
      <div key={order.id} className="glass-card rounded-[40px] p-10 premium-shadow border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between mb-8">
          <div className="flex gap-4">
             <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                <Package className="w-8 h-8 text-green-600" />
             </div>
             <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Restaurant</p>
                <h3 className="font-black text-xl text-gray-900 tracking-tight leading-none mb-1">
                  {(order.vendors?.restaurant_name || 'Restaurant').toUpperCase()}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-500">For {order.profiles?.name || 'Customer'}</p>
                  <span className="w-1 h-1 bg-gray-300 rounded-full" />
                  <p className="text-xs font-bold text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
             </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-green-600 tracking-tighter">{getSetting('currency_symbol', '₦')}{order.total_price.toFixed(2)}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Total</p>
          </div>
        </div>

        {isMyOrder && ['ready', 'picked_up'].includes(order.status) && (
          <div className="mb-10 px-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-2 left-0 right-0 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                  style={{ width: `${(stepIndex / (deliverySteps.length - 1)) * 100}%` }}
                />
              </div>
              {deliverySteps.map((step, idx) => (
                <div key={step.key} className="relative flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full border-4 z-10 transition-all duration-500 ${
                      stepIndex >= idx
                        ? 'bg-white border-green-500 shadow-lg shadow-green-100 scale-110'
                        : 'bg-white border-gray-100'
                    }`}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-tighter mt-4 text-center transition-colors duration-500 ${
                    stepIndex >= idx ? 'text-green-600' : 'text-gray-300'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
              <p className="font-bold text-gray-900 leading-tight">{order.delivery_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recipient Phone</p>
              <p className="font-bold text-gray-900">{order.phone}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isMyOrder && order.status === 'ready' && (
          <button
            onClick={() => acceptOrder(order.id)}
            className="w-full bg-green-600 text-white py-5 rounded-[24px] hover:bg-green-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-green-100 active:scale-[0.98] text-xs"
          >
            ACCEPT DELIVERY
          </button>
        )}

        {isMyOrder && order.status === 'ready' && (
          <div className="flex gap-4">
            <button
              onClick={() => markPickedUp(order.id)}
              className="flex-[2] bg-blue-600 text-white py-5 rounded-[24px] hover:bg-blue-700 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 text-xs"
            >
              <Truck className="w-5 h-5" />
              PICKED UP
            </button>
            <button
              onClick={() => dropOrder(order.id)}
              disabled={dropping === order.id}
              className="flex-1 rounded-[24px] border border-red-100 text-red-500 hover:bg-red-50 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 text-[10px]"
            >
              <XCircle className="w-4 h-4" />
              {dropping === order.id ? '...' : 'DROP'}
            </button>
          </div>
        )}

        {isMyOrder && order.status === 'picked_up' && (
          <button
            onClick={() => completeDelivery(order.id)}
            className="w-full bg-green-600 text-white py-5 rounded-[24px] hover:bg-green-700 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-green-100 active:scale-[0.98] text-xs"
          >
            <CheckCircle className="w-5 h-5" />
            MARK AS DELIVERED
          </button>
        )}
      </div>
    );
  };

  const renderHistoryCard = (order: Order) => (
    <div key={order.id} className="glass-card rounded-[32px] p-8 premium-shadow border border-white/50 flex items-center justify-between hover:scale-[1.01] transition-transform">
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
           <Package className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h3 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{order.vendors?.restaurant_name}</h3>
          <p className="text-xs font-bold text-gray-500">Delivered to {order.profiles?.name || 'Customer'}</p>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-xl text-green-600 tracking-tighter">+{getSetting('currency_symbol', '₦')}{(order.total_price * 0.1).toFixed(2)}</p>
        <div className="flex items-center gap-1 justify-end mt-1">
           <CheckCircle className="w-3 h-3 text-green-500" />
           <span className="text-[10px] font-black uppercase tracking-widest text-green-600">DELIVERED</span>
        </div>
      </div>
    </div>
  );

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
               <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Deliveries</h1>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Order Management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100/50 backdrop-blur-md rounded-[24px] p-2 mb-10 border border-gray-100">
          <button
            onClick={() => setTab('active')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
              tab === 'active'
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Package className="w-4 h-4" />
            Active
            {activeOrders.length > 0 && (
              <span className="bg-green-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-green-100">
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${
              tab === 'history'
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-gray-100'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <History className="w-4 h-4" />
            History
            {historyOrders.length > 0 && (
              <span className="bg-gray-200 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full">
                {historyOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Tab */}
        {tab === 'active' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isOnline && activeOrders.length === 0 && (
              <div className="glass-card rounded-[32px] p-10 text-center mb-8 border border-white/50 bg-amber-50/30">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight mb-2">You are offline</h3>
                <p className="text-amber-700/70 font-bold">Go online from the dashboard to see available deliveries.</p>
              </div>
            )}
            {activeOrders.length === 0 && isOnline ? (
              <div className="glass-card rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-black uppercase tracking-widest">No available deliveries yet</p>
                <p className="text-gray-300 text-sm font-bold mt-2">New orders will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-8">{activeOrders.map(renderOrderCard)}</div>
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {historyOrders.length === 0 ? (
              <div className="glass-card rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100">
                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                  <History className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-black uppercase tracking-widest">No history found</p>
              </div>
            ) : (
              <div className="space-y-6">{historyOrders.map(renderHistoryCard)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
