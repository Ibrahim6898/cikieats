import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, DollarSign } from 'lucide-react';

interface Vendor {
  id: string;
  restaurant_name: string;
  cuisine: string;
  address: string;
  delivery_fee: number;
  is_open: boolean;
  vendor_images: { image_url: string; display_order: number }[];
}

export function Home() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*, vendor_images(image_url, display_order)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-green-600">CIKIEats</h1>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search restaurants or cuisine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Restaurants near you</h2>

        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No restaurants found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <Link
                key={vendor.id}
                to={`/restaurant/${vendor.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="relative h-48">
                  {vendor.vendor_images?.[0]?.image_url ? (
                    <img
                      src={vendor.vendor_images[0].image_url}
                      alt={vendor.restaurant_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <span className="text-white text-xl font-bold text-center px-4">{vendor.restaurant_name}</span>
                    </div>
                  )}
                  {!vendor.is_open && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium">
                        Closed
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {vendor.restaurant_name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{vendor.cuisine}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{vendor.address}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>₦{vendor.delivery_fee}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

