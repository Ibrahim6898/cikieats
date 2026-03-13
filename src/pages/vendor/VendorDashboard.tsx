import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import {
  Store, Menu, ShoppingBag, AlertCircle,
  ImagePlus, X, Pencil, PauseCircle,
  TrendingUp, Banknote, Clock, CheckCircle, ChevronDown, ChevronUp, Mail, Phone, MessageCircle
} from 'lucide-react';

interface Vendor {
  id: string;
  restaurant_name: string;
  cuisine: string;
  address: string;
  landmark: string | null;
  delivery_fee: number;
  status: string;
  is_open: boolean;
}

interface VendorImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface MiniOrder {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  profiles: { name: string };
  order_items: {
    quantity: number;
    menu_items: { name: string };
  }[];
}

interface VendorStats {
  todayEarnings: number;
  activeOrders: number;
  completedToday: number;
}

export function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Registration form (used when vendor is null)
  const [formData, setFormData] = useState({
    restaurant_name: '',
    cuisine: '',
    address: '',
    landmark: '',
    delivery_fee: '0',
  });

  // Edit info state
  const [editingInfo, setEditingInfo] = useState(false);
  const [editData, setEditData] = useState({
    restaurant_name: '',
    cuisine: '',
    address: '',
    landmark: '',
    delivery_fee: '0',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Image management state
  const [vendorImages, setVendorImages] = useState<VendorImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // New: Pending orders count (Phase 1) - now expanded in Phase 2
  const [activeOrders, setActiveOrders] = useState<MiniOrder[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    todayEarnings: 0,
    activeOrders: 0,
    completedToday: 0
  });
  const [showProfile, setShowProfile] = useState(false); // Collapsible profile for secondary priority

  useEffect(() => {
    if (user) {
      fetchVendor();
      const channel = subscribeToOrders();
      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchVendor = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase
        .from('vendors')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle() as any);

      if (error) throw error;
      setVendor(data);
      if (data) {
        fetchImages(data.id);
        fetchDashboardData(data.id);
        setEditData({
          restaurant_name: data.restaurant_name,
          cuisine: data.cuisine,
          address: data.address,
          landmark: data.landmark || '',
          delivery_fee: String(data.delivery_fee),
        });
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (vendorId: string) => {
    try {
      // 1. Fetch Active Orders for Feed
      const { data: ordersData, error: ordersError } = await (supabase
        .from('orders') as any)
        .select(`
          id, status, total_price, created_at,
          profiles!orders_customer_id_fkey(name),
          order_items(quantity, menu_items(name))
        `)
        .eq('vendor_id', vendorId)
        .in('status', ['pending', 'accepted', 'preparing', 'ready', 'picked_up'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;
      setActiveOrders(ordersData || []);

      // 2. Fetch Stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders, error: statsError } = await (supabase
        .from('orders') as any)
        .select('total_price, status, created_at')
        .eq('vendor_id', vendorId)
        .gte('created_at', today.toISOString());

      if (statsError) throw statsError;

      const statsUpdate = {
        todayEarnings: todayOrders
          ?.filter((o: any) => o.status === 'delivered')
          .reduce((sum: number, o: any) => sum + Number(o.total_price), 0) || 0,
        activeOrders: ordersData?.length || 0,
        completedToday: todayOrders?.filter((o: any) => o.status === 'delivered').length || 0
      };
      setStats(statsUpdate);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const subscribeToOrders = () => {
    if (!user) return;
    const channel = supabase
      .channel('vendor_dashboard_nerve_center')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          if (vendor?.id) {
            fetchDashboardData(vendor.id);
          } else {
            fetchVendor();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await (supabase
        .from('orders') as any)
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      if (vendor) fetchDashboardData(vendor.id);
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const fetchImages = async (vendorId: string) => {
    const { data } = await supabase
      .from('vendor_images')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('display_order', { ascending: true });
    setVendorImages(data || []);
  };

  // ── Registration ──────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('vendors').insert({
        owner_id: user.id,
        restaurant_name: formData.restaurant_name,
        cuisine: formData.cuisine,
        address: formData.address,
        landmark: formData.landmark || null,
        delivery_fee: parseFloat(formData.delivery_fee),
      } as any);
      if (error) throw new Error(`Failed to create restaurant: ${error.message}`);
      await fetchVendor();
    } catch (error: any) {
      setError(error.message || 'Please try again.');
      alert(`Failed to create restaurant: ${error.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit Info ─────────────────────────────────────────────
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async () => {
    if (!vendor) return;
    setInfoError('');
    setSavingInfo(true);
    try {
      const { error } = await (supabase.from('vendors') as any)
        .update({
          restaurant_name: editData.restaurant_name,
          cuisine: editData.cuisine,
          address: editData.address,
          landmark: editData.landmark || null,
          delivery_fee: parseFloat(editData.delivery_fee),
        })
        .eq('id', vendor.id);
      if (error) throw error;
      await fetchVendor();
      setEditingInfo(false);
    } catch (err: any) {
      setInfoError(err.message || 'Failed to save. Please try again.');
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Open/Close toggle ─────────────────────────────────────
  const toggleOpen = async () => {
    if (!vendor) return;
    try {
      const { error } = await (supabase.from('vendors') as any)
        .update({ is_open: !vendor.is_open })
        .eq('id', vendor.id);
      if (error) throw error;
      setVendor({ ...vendor, is_open: !vendor.is_open });
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  // ── Image upload/delete ───────────────────────────────────
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!vendor) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (vendorImages.length >= 3) { setImageError('Max 3 images allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError('Image must be smaller than 5MB.'); return; }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('vendor-images').upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('vendor-images').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('vendor_images').insert({
        vendor_id: vendor.id,
        image_url: publicUrl,
        display_order: vendorImages.length,
      } as any);
      if (dbError) throw dbError;
      await fetchImages(vendor.id);
    } catch (err: any) {
      setImageError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (img: VendorImage) => {
    if (!vendor) return;
    try {
      const url = new URL(img.image_url);
      const pathParts = url.pathname.split('/vendor-images/');
      if (pathParts[1]) await supabase.storage.from('vendor-images').remove([pathParts[1]]);
      await supabase.from('vendor_images').delete().eq('id', img.id);
      await fetchImages(vendor.id);
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Your Restaurant</h1>
            <p className="text-gray-600 mb-6">Fill in the details below to get started on CIKIEats</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
              {[
                { label: 'Restaurant Name', name: 'restaurant_name', type: 'text', required: true },
                { label: 'Cuisine Type', name: 'cuisine', type: 'text', required: true, placeholder: 'e.g., Yoruba, Fast Food' },
                { label: 'Address', name: 'address', type: 'text', required: true },
                { label: 'Landmark (Optional)', name: 'landmark', type: 'text', required: false },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={formData[field.name as keyof typeof formData]}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee ({getSetting('currency_symbol', '₦')})</label>
                <input type="number" name="delivery_fee" required min="0" step="0.01"
                  value={formData.delivery_fee} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Registering...' : 'Register Restaurant'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (vendor.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <PauseCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
          <p className="text-gray-600 mb-4">
            Your restaurant account has been suspended by the administrator. 
            Customers cannot see your restaurant or place orders during suspension.
          </p>
          <div className="space-y-4 pt-4 border-t border-gray-100 flex flex-col items-center">
            <p className="text-sm text-gray-500">
              Please contact support if you believe this is an error.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={`mailto:${getSetting('support_email')}?subject=Vendor Suspension Inquiry: ${vendor.restaurant_name} (${vendor.id})`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95"
              >
                <Mail className="w-5 h-5" />
                Email
              </a>
              <a
                href={`https://wa.me/${getSetting('support_whatsapp')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-bold rounded-2xl hover:bg-[#128C7E] transition-all shadow-lg shadow-green-100 active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (vendor.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-gray-600">Your restaurant registration is awaiting admin approval.</p>
        </div>
      </div>
    );
  }

  if (vendor.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Rejected</h2>
          <p className="text-gray-600 mb-6">Please contact support for more information.</p>
          <div className="flex flex-col gap-3">
            <a
              href={`mailto:${getSetting('support_email')}?subject=Vendor Rejection Inquiry: ${vendor.restaurant_name}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg shadow-gray-100 active:scale-95"
            >
              <Mail className="w-5 h-5" />
              Contact Email
            </a>
            <a
              href={`tel:${getSetting('support_phone')}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
            >
              <Phone className="w-5 h-5" />
              Call Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${vendor.is_open ? 'bg-gray-50' : 'bg-gray-100'}`}>
      {/* Global Status Banner for Closed Shop */}
      {!vendor.is_open && (
        <div className="bg-orange-500 text-white py-2 px-4 text-center font-bold text-sm tracking-wide animate-pulse">
          YOUR STORE IS OFFLINE & HIDDEN FROM CUSTOMERS
        </div>
      )}

      {/* Header */}
      <div className={`bg-white shadow-sm border-b transition-colors ${!vendor.is_open ? 'opacity-75 grayscale-[0.5]' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${vendor.is_open ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                <Store className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{vendor.restaurant_name}</h1>
                <p className="text-sm text-gray-500 font-medium">Vendor Dashboard • Operational Nerve Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all ${
                vendor.is_open ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${vendor.is_open ? 'bg-green-500 border-2 border-green-200' : 'bg-red-500 animate-pulse'}`}></div>
                <span className="font-bold text-sm">{vendor.is_open ? 'ONLINE & ACTIVE' : 'OFFLINE'}</span>
                <button onClick={toggleOpen}
                  className={`ml-4 px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-sm bg-white border border-gray-200 hover:shadow-md active:scale-95`}>
                  Toggle Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-opacity ${!vendor.is_open ? 'opacity-60' : ''}`}>

        {/* Priority 1: Performance Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-5 bg-green-600 rounded-full w-24 h-24 group-hover:scale-125 transition-transform" />
             <div className="flex items-center gap-4">
               <div className="p-4 bg-green-50 rounded-2xl text-green-600">
                 <Banknote className="w-6 h-6" />
               </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's Sales</p>
                  <p className="text-2xl font-black text-gray-900">{getSetting('currency_symbol', '₦')}{stats.todayEarnings.toFixed(2)}</p>
                </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-5 bg-blue-600 rounded-full w-24 h-24 group-hover:scale-125 transition-transform" />
             <div className="flex items-center gap-4">
               <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                 <ShoppingBag className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Tasks</p>
                 <p className="text-2xl font-black text-gray-900">{stats.activeOrders} Orders</p>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition group overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-5 bg-orange-600 rounded-full w-24 h-24 group-hover:scale-125 transition-transform" />
             <div className="flex items-center gap-4">
               <div className="p-4 bg-orange-50 rounded-2xl text-orange-600">
                 <CheckCircle className="w-6 h-6" />
               </div>
               <div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Done Today</p>
                 <p className="text-2xl font-black text-gray-900">{stats.completedToday}</p>
               </div>
             </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Real-time Order Feed (70%) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Live Order Feed</h2>
                  <p className="text-xs text-gray-400 font-medium">Automatic updates as they happen</p>
                </div>
                <button onClick={() => navigate('/vendor/orders')} className="text-xs font-bold text-green-600 hover:underline">
                  VIEW ALL HISTORY
                </button>
              </div>

              <div className="divide-y divide-gray-50">
                {activeOrders.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-medium">Quiet for now. No active orders.</p>
                  </div>
                ) : (
                  activeOrders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-gray-50 transition lg:flex items-center justify-between gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-xs text-gray-400 font-bold">#{order.id.slice(0, 8)}</span>
                        </div>
                        <h4 className="font-bold text-gray-900">Order from {order.profiles.name}</h4>
                        <ul className="text-sm text-gray-500">
                          {order.order_items.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-gray-300 rounded-full" />
                              {item.menu_items.name} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                       <div className="mt-4 lg:mt-0 flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-gray-900">{getSetting('currency_symbol', '₦')}{order.total_price.toFixed(2)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {order.status === 'pending' && (
                            <button onClick={() => updateOrderStatus(order.id, 'accepted')} 
                              className="bg-green-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition shadow-sm active:scale-95">
                              ACCEPT
                            </button>
                          )}
                          {order.status === 'accepted' && (
                            <button onClick={() => updateOrderStatus(order.id, 'preparing')} 
                              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm active:scale-95">
                              PREPARE
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button onClick={() => updateOrderStatus(order.id, 'ready')} 
                              className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm active:scale-95">
                              READY
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Quick Setup & Settings (30%) */}
          <div className="lg:col-span-4 space-y-6">
            <button onClick={() => navigate('/vendor/menu')}
              className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition text-left group">
              <div className="flex items-center justify-between mb-2">
                 <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-100 transition">
                   <Menu className="w-6 h-6" />
                 </div>
                 <TrendingUp className="w-5 h-5 text-gray-200" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Manage Menu</h3>
              <p className="text-sm text-gray-500 font-medium">Update items, prices, and availability</p>
            </button>

            {/* Collapsible Store Profile Details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3 text-gray-700">
                  <Store className="w-5 h-5" />
                  <span className="font-bold">Store Profile</span>
                </div>
                {showProfile ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showProfile && (
                <div className="p-6 pt-0 space-y-6 border-t border-gray-50 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                      {!editingInfo && (
                        <button
                          onClick={() => { setEditingInfo(true); setInfoError(''); }}
                          className="text-xs text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-bold border border-green-100"
                        >
                          <Pencil className="w-3.5 h-3.5 inline mr-1" /> EDIT INFO
                        </button>
                      )}
                    </div>

                    {editingInfo ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Name', name: 'restaurant_name' },
                          { label: 'Cuisine', name: 'cuisine' },
                          { label: 'Address', name: 'address' },
                        ].map(field => (
                          <div key={field.name}>
                            <input
                              type="text"
                              name={field.name}
                              placeholder={field.label}
                              value={editData[field.name as keyof typeof editData]}
                              onChange={handleEditChange}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <button onClick={handleSaveInfo} disabled={savingInfo} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition disabled:opacity-50">
                            {savingInfo ? 'SAVING...' : 'SAVE'}
                          </button>
                          <button onClick={() => setEditingInfo(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition">X</button>
                        </div>
                        {infoError && <p className="text-[10px] text-red-500 font-bold">{infoError}</p>}
                      </div>
                    ) : (
                      <dl className="text-xs space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-gray-400">Cuisine</dt>
                          <dd className="font-bold text-gray-700">{vendor.cuisine}</dd>
                        </div>
                         <div className="flex justify-between">
                          <dt className="text-gray-400">Delivery Fee</dt>
                          <dd className="font-bold text-gray-700">{getSetting('currency_symbol', '₦')}{Number(vendor.delivery_fee).toFixed(2)}</dd>
                        </div>
                        <div className="pt-2">
                          <dt className="text-gray-400 mb-1">Address</dt>
                          <dd className="font-medium text-gray-700 bg-gray-50 p-3 rounded-2xl italic leading-relaxed">{vendor.address}</dd>
                        </div>
                      </dl>
                    )}

                    <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-3">Store Photos</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map(idx => (
                          <div key={idx} className="aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center group relative">
                            {vendorImages[idx] ? (
                              <>
                                <img src={vendorImages[idx].image_url} className="w-full h-full object-cover" />
                                <button onClick={() => handleDeleteImage(vendorImages[idx])} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="relative cursor-pointer hover:bg-gray-100 w-full h-full flex items-center justify-center transition">
                                {uploadingImage ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                                ) : (
                                  <>
                                    <ImagePlus className="w-4 h-4 text-gray-200" />
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadImage} disabled={uploadingImage} />
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {imageError && <p className="text-[10px] text-red-500 font-bold mt-2">{imageError}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Support/Quick Links */}
            <div className="p-6 bg-green-900 rounded-3xl text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                  <AlertCircle className="w-24 h-24" />
               </div>
                <h4 className="text-lg font-bold mb-1">Need help?</h4>
                <p className="text-xs text-green-200 font-medium mb-4">Our support team is available 24/7</p>
                <div className="flex flex-col gap-2">
                 <a
                  href={`mailto:${getSetting('support_email')}?subject=Vendor Support Request: ${vendor.restaurant_name}`}
                  className="bg-white text-green-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-50 transition-colors inline-block text-center"
                 >
                    EMAIL SUPPORT
                 </a>
                 <a
                  href={`https://wa.me/${getSetting('support_whatsapp')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-green-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-400 transition-colors inline-block text-center"
                 >
                    WHATSAPP CHAT
                 </a>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
