import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, MapPin, DollarSign, Plus, ShoppingCart } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
}

interface Vendor {
  id: string;
  restaurant_name: string;
  cuisine: string;
  address: string;
  delivery_fee: number;
  is_open: boolean;
}

export function Restaurant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRestaurant();
    }
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_id', id)
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (menuError) throw menuError;
      setMenuItems(menuData || []);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!vendor) return;
    addItem({
      id: item.id,
      menu_item_id: item.id,
      vendor_id: vendor.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="relative bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Cart
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {vendor.restaurant_name}
              </h1>
              <p className="text-gray-600 mb-4">{vendor.cuisine}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {vendor.address}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>Delivery Fee: ₦{vendor.delivery_fee}</span>
                </div>
              </div>
            </div>
            {!vendor.is_open && (
              <span className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium">
                Closed
              </span>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>

        {menuItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No menu items available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-green-600">
                      ₦{item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!vendor.is_open}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
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
