import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, TrendingUp } from 'lucide-react';

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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riderId, setRiderId] = useState<string | null>(null);
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
      const { data: riderData } = await supabase
        .from('riders')
        .select('id, deliveries_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (riderData) {
        setRiderId(riderData.id);

        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(`
            *,
            vendors(restaurant_name)
          `)
          .eq('rider_id', riderData.id)
          .eq('status', 'delivered')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const deliveredOrders = ordersData || [];
        const totalEarnings = deliveredOrders.reduce((sum, order) => sum + (order.total_price * 0.1), 0);

        setDeliveries(deliveredOrders);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Earnings</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-green-600">
                  ${stats.totalEarnings.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalDeliveries}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-100" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg per Delivery</p>
                <p className="text-3xl font-bold text-orange-600">
                  ${stats.averagePerDelivery.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-orange-100" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Delivery History</h2>
          </div>

          {deliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No completed deliveries yet
            </div>
          ) : (
            <div className="divide-y">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <h3 className="font-medium text-gray-900">{delivery.vendors.restaurant_name}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(delivery.created_at).toLocaleDateString()}{' '}
                      {new Date(delivery.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${(delivery.total_price * 0.1).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">(10% of ${delivery.total_price.toFixed(2)})</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
