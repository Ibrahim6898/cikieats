import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  phone: string;
  total_price: number;
  created_at: string;
  profiles: {
    name: string;
  };
  order_items: {
    quantity: number;
    menu_items: {
      name: string;
    };
  }[];
}

export function VendorOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVendorAndOrders();
      subscribeToOrders();
    }
  }, [user]);

  const fetchVendorAndOrders = async () => {
    if (!user) return;
    try {
      const { data: vendorData } = await (supabase
        .from('vendors') as any)
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (vendorData) {
        const { data: ordersData, error } = await (supabase
          .from('orders') as any)
          .select(`
            *,
            profiles!orders_customer_id_fkey(name),
            order_items(
              quantity,
              menu_items(name)
            )
          `)
          .eq('vendor_id', vendorData.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(ordersData || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    if (!user) return;
    const channel = supabase
      .channel('vendor_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchVendorAndOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      await fetchVendorAndOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
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
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          { label: 'Accept', status: 'accepted', color: 'bg-green-600' },
          { label: 'Reject', status: 'cancelled', color: 'bg-red-600' },
        ];
      case 'accepted':
        return [{ label: 'Start Preparing', status: 'preparing', color: 'bg-blue-600' }];
      case 'preparing':
        return [{ label: 'Mark Ready', status: 'ready', color: 'bg-green-600' }];
      default:
        return [];
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/vendor')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      Order from {order.profiles?.name || 'Customer'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()} at{' '}
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Items:</p>
                    <ul className="space-y-1">
                      {order.order_items.map((item, idx) => (
                        <li key={idx} className="text-sm">
                          {item.menu_items.name} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Delivery Details:</p>
                    <p className="text-sm">{order.delivery_address}</p>
                    <p className="text-sm">{order.phone}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-xl font-bold text-green-600">
                    ₦{order.total_price.toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    {getAvailableActions(order.status).map((action) => (
                      <button
                        key={action.status}
                        onClick={() => updateOrderStatus(order.id, action.status)}
                        className={`${action.color} text-white px-6 py-2 rounded-lg hover:opacity-90 transition`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
