import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface Vendor {
  id: string;
  restaurant_name: string;
  cuisine: string;
  address: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

export function AdminVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
    subscribeToVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('vendors')
        .select(`
          *,
          profiles!owner_id(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vendors:', error);
        setError(error.message);
        return;
      }
      console.log('Fetched vendors:', data);
      setVendors(data || []);
    } catch (err) {
      console.error('Unexpected error fetching vendors:', err);
      setError('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToVendors = () => {
    const channel = supabase
      .channel('vendors_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors',
        },
        () => {
          fetchVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateVendorStatus = async (vendorId: string, newStatus: string) => {
    try {
      const { error } = await (supabase
        .from('vendors') as any)
        .update({ status: newStatus })
        .eq('id', vendorId);

      if (error) throw error;
      await fetchVendors();
    } catch (error) {
      console.error('Error updating vendor status:', error);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Vendors</h1>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Cuisine
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
                {error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-red-600">
                      Error loading vendors: {error}
                    </td>
                  </tr>
                ) : vendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{vendor.restaurant_name}</p>
                        <p className="text-sm text-gray-600">{vendor.address}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-900">{vendor.profiles?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{vendor.profiles?.email || 'No email'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendor.cuisine}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                            vendor.status
                          )}`}
                        >
                          {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-2">
                        {vendor.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateVendorStatus(vendor.id, 'approved')}
                              className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => updateVendorStatus(vendor.id, 'rejected')}
                              className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
