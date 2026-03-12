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
  { key: 'picked_up', label: 'Out for Delivery' },
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600">Start ordering to see your order history</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left w-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(order.status)}
                      <h3 className="font-bold text-lg">
                        {order.vendors.restaurant_name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()} at{' '}
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ₦{order.total_price.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                      {order.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">Items:</p>
                  <ul className="text-sm mt-1">
                    {order.order_items.map((item, idx) => (
                      <li key={idx} className="text-gray-900">
                        {item.menu_items.name} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-3 left-0 right-0 h-1 bg-gray-200">
                        <div
                          className="h-full bg-green-600 transition-all"
                          style={{
                            width: `${(getStatusProgress(order.status) / (statusSteps.length - 1)) * 100}%`,
                          }}
                        />
                      </div>
                      {statusSteps.map((step, idx) => (
                        <div
                          key={step.key}
                          className="relative flex flex-col items-center"
                        >
                          <div
                            className={`w-6 h-6 rounded-full border-2 ${
                              getStatusProgress(order.status) >= idx
                                ? 'bg-green-600 border-green-600'
                                : 'bg-white border-gray-300'
                            } z-10`}
                          />
                          <span className="text-xs text-gray-600 mt-2 text-center max-w-20">
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
