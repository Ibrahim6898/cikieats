import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Banknote } from 'lucide-react';

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
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Search & Hero Section */}
      <div className="relative bg-white border-b border-gray-100 pt-8 pb-12 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-transparent opacity-60" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-[0.9] mb-4 uppercase italic">
                Discover <br />
                <span className="text-green-600">Delicious</span>
              </h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] leading-relaxed">
                The finest local flavors <br />
                delivered to your doorstep.
              </p>
            </div>
            
            <div className="flex-1 max-w-2xl w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-green-400 rounded-[28px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center bg-white rounded-[24px] shadow-2xl shadow-black/5 border border-gray-100">
                  <Search className="absolute left-6 text-gray-400 w-5 h-5 group-focus-within:text-green-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search restaurants, cuisines, or dishes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-8 py-6 bg-transparent rounded-[24px] outline-none text-lg font-bold text-gray-900 placeholder-gray-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {['All', 'Pizza', 'Burgers', 'Sushi', 'African', 'Healthy'].map((cat) => (
              <button
                key={cat}
                className="px-6 py-2.5 bg-gray-50 hover:bg-green-50 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-green-600 border border-gray-100 hover:border-green-100 rounded-xl transition-all active:scale-95"
              >
                {cat}
              </button>
            ))}
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
                className="bg-white rounded-[2rem] shadow-sm hover:shadow-2xl hover-scale transition-all duration-500 overflow-hidden border border-gray-100 group"
              >
                <div className="relative h-56 overflow-hidden">
                  {vendor.vendor_images?.[0]?.image_url ? (
                    <img
                      src={vendor.vendor_images[0].image_url}
                      alt={vendor.restaurant_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <span className="text-white text-3xl font-black text-center px-6 opacity-40 uppercase tracking-tighter">
                        {vendor.restaurant_name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  <div className="absolute top-4 right-4">
                    <span className="bg-white/90 backdrop-blur-md text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      {vendor.cuisine}
                    </span>
                  </div>
                  {!vendor.is_open && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
                      <span className="bg-red-500 text-white px-6 py-2.5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl ring-4 ring-red-500/20">
                        Closed Now
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-xl text-gray-900 group-hover:text-green-600 transition-colors">
                      {vendor.restaurant_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-green-500" />
                      <span className="truncate max-w-[120px]">{vendor.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto text-gray-900">
                      <Banknote className="w-4 h-4 text-green-500" />
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

