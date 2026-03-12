import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Bike, ShoppingBag, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';

interface Rider {
  id: string;
  user_id: string;
  phone: string;
  vehicle_type: string;
  status: string;
  is_online: boolean;
  deliveries_completed: number;
}

export function RiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    vehicle_type: 'motorcycle',
  });

  useEffect(() => {
    if (user) {
      fetchRider();
    }
  }, [user]);

  const fetchRider = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('riders')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setRider(data);
      if (!data) {
        setShowForm(true);
      }
    } catch (error) {
      console.error('Error fetching rider:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await (supabase.from('riders') as any).insert({
        user_id: user.id,
        phone: formData.phone,
        vehicle_type: formData.vehicle_type,
      });

      if (error) {
        console.error('Rider profile creation error:', error);
        throw new Error(`Failed to create profile: ${error.message}`);
      }
      await fetchRider();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error creating rider profile:', error);
      alert(`Failed to create profile: ${error.message || 'Please try again.'}`);
    }
  };

  const toggleOnline = async () => {
    if (!rider) return;
    try {
      const { error } = await (supabase
        .from('riders') as any)
        .update({ is_online: !rider.is_online })
        .eq('id', rider.id);

      if (error) throw error;
      setRider({ ...rider, is_online: !rider.is_online });
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!rider || showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Rider</h1>
            <p className="text-gray-600 mb-6">Complete your profile to start accepting deliveries</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="car">Car</option>
                  <option value="truck">Truck</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
              >
                Create Profile
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (rider.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-gray-600">
            Your rider profile is awaiting admin approval. You'll be notified once approved.
          </p>
        </div>
      </div>
    );
  }

  if (rider.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Rejected</h2>
          <p className="text-gray-600">
            Unfortunately, your rider application was not approved. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Rider Dashboard</h1>
            <button
              onClick={toggleOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                rider.is_online
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {rider.is_online ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  Online
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  Offline
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <ShoppingBag className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-3xl font-bold text-gray-900">{rider.deliveries_completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Bike className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{rider.vehicle_type}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {rider.is_online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/rider/orders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <ShoppingBag className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Available Deliveries</h3>
            <p className="text-gray-600">View and accept delivery orders</p>
          </button>

          <button
            onClick={() => navigate('/rider/earnings')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <DollarSign className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Earnings</h3>
            <p className="text-gray-600">Track your earnings and statistics</p>
          </button>
        </div>
      </div>
    </div>
  );
}
