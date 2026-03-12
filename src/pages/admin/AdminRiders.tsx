import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface Rider {
  id: string;
  phone: string;
  vehicle_type: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

export function AdminRiders() {
  const navigate = useNavigate();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiders();
    subscribeToRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      const { data, error } = await supabase
        .from('riders')
        .select(`
          *,
          profiles(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiders(data || []);
    } catch (error) {
      console.error('Error fetching riders:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRiders = () => {
    const channel = supabase
      .channel('riders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'riders',
        },
        () => {
          fetchRiders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateRiderStatus = async (riderId: string, newStatus: string) => {
    try {
      const { error } = await (supabase
        .from('riders') as any)
        .update({ status: newStatus })
        .eq('id', riderId);

      if (error) throw error;
      await fetchRiders();
    } catch (error) {
      console.error('Error updating rider status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Riders</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rider.profiles?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {rider.profiles?.email || 'No email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rider.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {rider.vehicle_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                          rider.status
                        )}`}
                      >
                        {rider.status.charAt(0).toUpperCase() + rider.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      {rider.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateRiderStatus(rider.id, 'approved')}
                            className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateRiderStatus(rider.id, 'rejected')}
                            className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
