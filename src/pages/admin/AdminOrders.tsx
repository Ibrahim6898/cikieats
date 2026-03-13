import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, XCircle, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  profiles: {
    name: string;
  };
  vendors: {
    restaurant_name: string;
  };
}

export function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    subscribeToOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(name),
          vendors(restaurant_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel('admin_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
      case 'picked_up':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition border border-gray-100 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                Order <span className="text-green-600">Monitoring</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Transaction Stream</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="glass-card rounded-[40px] p-20 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No orders found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id} 
                className="glass-card rounded-[32px] p-8 premium-shadow hover:scale-[1.01] transition-all duration-300 border border-white/50 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  {/* Info Section */}
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                      <ShoppingBag className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-2">
                        {order.vendors?.restaurant_name || 'Restaurant'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500">For {order.profiles?.name || 'Customer'}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                          {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Data */}
                  <div className="flex items-center gap-12 px-8 py-4 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Amount</p>
                      <p className="text-lg font-black text-gray-900 tracking-tighter">₦{order.total_price.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Order Status</p>
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(order.status)} shadow-sm`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-3">
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        onClick={() => cancelOrder(order.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition group/cancel"
                      >
                        <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        Force Cancel
                      </button>
                    )}
                    <button className="p-3 text-gray-300 hover:text-gray-900 transition">
                       <ArrowLeft className="w-5 h-5 opacity-0 group-hover:opacity-100 rotate-180 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
