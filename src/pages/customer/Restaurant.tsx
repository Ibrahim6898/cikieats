import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import { ArrowLeft, MapPin, Banknote, Plus, ShoppingCart, Utensils, Clock } from 'lucide-react';

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
  vendor_images?: { image_url: string }[];
}

export function Restaurant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { getSetting, isOperatingHours } = useSettings();

  useEffect(() => {
    if (id) {
      fetchRestaurant();
    }
  }, [id]);

  const fetchRestaurant = async () => {
    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_images (
            image_url
          )
        `)
        .eq('id', id as string)
        .maybeSingle();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('vendor_id', id as string)
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
        <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/40 mb-12 premium-shadow">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
             {vendor.vendor_images && vendor.vendor_images.length > 0 ? (
               <>
                 <img 
                   src={vendor.vendor_images[0].image_url} 
                   alt={vendor.restaurant_name}
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
               </>
             ) : (
               <>
                 <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-900 opacity-90" />
                 <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <Utensils className="w-64 h-64 text-white rotate-12" />
                 </div>
               </>
             )}
             <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 text-white">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-4">
                      {vendor.cuisine}
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-2">
                      {vendor.restaurant_name}
                    </h1>
                    <div className="flex items-center gap-6 text-sm font-bold opacity-80">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {vendor.address}
                      </div>
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        {getSetting('currency_symbol', '₦')}{vendor.delivery_fee} Delivery
                      </div>
                    </div>
                  </div>
                  {!isOperatingHours() ? (
                    <div className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl ring-4 ring-white/20 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Platform Closed
                    </div>
                  ) : !vendor.is_open && (
                    <div className="bg-red-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl ring-4 ring-white/20">
                      Closed Now
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-1.5 bg-green-600 rounded-full" />
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">On the Menu</h2>
        </div>

        {menuItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">No menu items available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group hover-scale"
              >
                <div className="relative h-56 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                      <Utensils className="w-12 h-12 text-green-200" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-black text-xl text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-green-600 tracking-tighter">
                      {getSetting('currency_symbol', '₦')}{item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={!vendor.is_open || !isOperatingHours()}
                      className="bg-green-600 text-white px-6 py-3 rounded-2xl hover:bg-green-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-200 active:scale-90"
                    >
                      <Plus className="w-5 h-5" />
                      Add to Cart
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
