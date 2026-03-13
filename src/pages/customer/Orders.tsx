import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  total_price: number;
  created_at: string;
  vendors: {
    restaurant_name: string;
  };
  order_items: {
    quantity: number;
    menu_items: {
      name: string;
    };
  }[];
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready for Pickup' },
  { key: 'picked_up', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

export function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
      subscribeToOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vendors(restaurant_name),
          order_items(
            quantity,
            menu_items(name)
          )
        `)
        .eq('customer_id', user.id)
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
    if (!user) return;
    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Clock className="w-6 h-6 text-orange-600" />;
    }
  };

  const getStatusProgress = (status: string) => {
    const index = statusSteps.findIndex((step) => step.key === status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="glass-card sticky top-20 z-50 px-4 sm:px-6 lg:px-8 py-6 mx-4 mt-4 rounded-2xl border-white/40 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Food Journey</h1>
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Track and manage your orders</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {orders.length === 0 ? (
          <div className="bg-white p-16 rounded-[3rem] shadow-2xl shadow-black/5 border border-white text-center">
            <div className="bg-green-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <Package className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No orders yet</h2>
            <p className="text-gray-500 font-medium mb-10 max-w-xs mx-auto">
              Ready to taste something amazing? Start exploring restaurants now!
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 text-white px-10 py-5 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-green-100 hover-scale"
            >
              Start Exploring
            </button>
          </div>
        ) : (
          <div className="grid gap-8">
            {orders.map((order) => {
              const isActive = !['delivered', 'cancelled'].includes(order.status);
              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className={`bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group text-left w-full hover-scale ${isActive ? 'ring-4 ring-green-600/10' : ''}`}
                >
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl shadow-lg ${isActive ? 'bg-green-600 shadow-green-100' : 'bg-gray-100'}`}>
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <h3 className="font-black text-2xl text-gray-900 group-hover:text-green-600 transition-colors uppercase tracking-tight">
                            {order.vendors?.restaurant_name || 'Restaurant'}
                          </h3>
                          <p className="text-sm text-gray-400 font-bold mt-1">
                            {new Date(order.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-green-600 tracking-tighter">
                          ₦{order.total_price.toFixed(2)}
                        </p>
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mt-2 ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 py-4 border-y border-gray-50 mb-8">
                      <Package className="w-4 h-4 text-gray-300" />
                      <div className="flex flex-wrap gap-2">
                        {order.order_items.map((item, idx) => (
                          <span key={idx} className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            {item.menu_items.name} <span className="text-green-600 ml-1">x{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {isActive && (
                      <div className="relative pt-6">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-xs font-black text-green-600 uppercase tracking-widest animate-pulse">Live Order Status</span>
                           <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                             {Math.round((getStatusProgress(order.status) / (statusSteps.length - 1)) * 100)}% Complete
                           </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-600 progress-glow transition-all duration-1000"
                            style={{
                              width: `${(getStatusProgress(order.status) / (statusSteps.length - 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-4 overflow-hidden">
                           {statusSteps.map((step, idx) => {
                             const isCompleted = getStatusProgress(order.status) >= idx;
                             return (
                               <div key={step.key} className="flex flex-col items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-600 scale-125 shadow-[0_0_10px_rgba(22,163,74,0.5)]' : 'bg-gray-200'}`} />
                                  <span className={`text-[10px] font-black uppercase tracking-tighter truncate max-w-[60px] ${isCompleted ? 'text-green-600' : 'text-gray-300'}`}>
                                    {step.label.split(' ')[0]}
                                  </span>
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
