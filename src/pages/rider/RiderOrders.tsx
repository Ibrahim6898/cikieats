import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MapPin, Phone, CheckCircle } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  phone: string;
  total_price: number;
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

export function RiderOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [riderId, setRiderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRiderAndOrders();
      subscribeToOrders();
    }
  }, [user]);

  const fetchRiderAndOrders = async () => {
    if (!user) return;
    try {
      const { data: riderData } = await supabase
        .from('riders')
        .select('id, is_online')
        .eq('user_id', user.id)
        .maybeSingle();

      if (riderData && riderData.is_online) {
        setRiderId(riderData.id);

        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(`
            *,
            riders(is_online),
            vendors(restaurant_name),
            profiles!orders_customer_id_fkey(name)
          `)
          .eq('status', 'ready')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(ordersData || []);
      } else {
        const { data: myOrders, error } = await supabase
          .from('orders')
          .select(`
            *,
            riders(is_online),
            vendors(restaurant_name),
            profiles!orders_customer_id_fkey(name)
          `)
          .eq('rider_id', riderData?.id)
          .in('status', ['picked_up', 'ready'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(myOrders || []);
      }
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
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchRiderAndOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const acceptOrder = async (orderId: string) => {
    if (!riderId) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ rider_id: riderId, status: 'picked_up' })
        .eq('id', orderId);

      if (error) throw error;
      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const completeDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (error) throw error;

      if (riderId) {
        const { data: rider } = await supabase
          .from('riders')
          .select('deliveries_completed')
          .eq('id', riderId)
          .maybeSingle();

        if (rider) {
          await supabase
            .from('riders')
            .update({ deliveries_completed: (rider.deliveries_completed || 0) + 1 })
            .eq('id', riderId);
        }
      }

      await fetchRiderAndOrders();
    } catch (error) {
      console.error('Error completing delivery:', error);
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
            onClick={() => navigate('/rider')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Available Deliveries</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No available deliveries at the moment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">
                      {order.vendors.restaurant_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      For: {order.profiles.name}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    ${order.total_price.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Delivery Address</p>
                      <p className="font-medium text-gray-900">{order.delivery_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{order.phone}</p>
                    </div>
                  </div>
                </div>

                {order.rider_id ? (
                  order.status === 'picked_up' && (
                    <button
                      onClick={() => completeDelivery(order.id)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Mark as Delivered
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => acceptOrder(order.id)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Accept Delivery
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
