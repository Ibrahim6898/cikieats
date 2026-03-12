import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Store, Menu, ShoppingBag, AlertCircle,
  ToggleLeft, ToggleRight, ImagePlus, X, Pencil, Check
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

export function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (user) fetchVendor();
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Fee (₦)</label>
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
          <p className="text-gray-600">Please contact support for more information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{vendor.restaurant_name}</h1>
            <button onClick={toggleOpen}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                vendor.is_open ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}>
              {vendor.is_open ? <><ToggleRight className="w-5 h-5" />Open</> : <><ToggleLeft className="w-5 h-5" />Closed</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => navigate('/vendor/menu')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left">
            <Menu className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Menu Management</h3>
            <p className="text-gray-600">Add, edit, and manage your menu items</p>
          </button>

          <button onClick={() => navigate('/vendor/orders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left">
            <ShoppingBag className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Orders</h3>
            <p className="text-gray-600">View and manage incoming orders</p>
          </button>
        </div>

        {/* Restaurant Info + Photos (combined card) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Card Header */}
          <div className="flex items-center gap-3 mb-6">
            <Store className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Restaurant Info & Photos</h2>
            {!editingInfo && (
              <button
                onClick={() => { setEditingInfo(true); setInfoError(''); }}
                className="ml-auto flex items-center gap-1 text-sm text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition font-medium"
              >
                <Pencil className="w-4 h-4" /> Edit Info
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Restaurant Info */}
            <div>
              {editingInfo ? (
                <div className="space-y-3">
                  {infoError && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{infoError}</p>
                  )}
                  {[
                    { label: 'Restaurant Name', name: 'restaurant_name', type: 'text' },
                    { label: 'Cuisine Type', name: 'cuisine', type: 'text' },
                    { label: 'Address', name: 'address', type: 'text' },
                    { label: 'Landmark (Optional)', name: 'landmark', type: 'text' },
                  ].map(field => (
                    <div key={field.name}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={editData[field.name as keyof typeof editData]}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Delivery Fee (₦)</label>
                    <input
                      type="number" name="delivery_fee" min="0" step="0.01"
                      value={editData.delivery_fee} onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveInfo} disabled={savingInfo}
                      className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50">
                      <Check className="w-4 h-4" />
                      {savingInfo ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setEditingInfo(false); setInfoError(''); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  {[
                    { label: 'Restaurant Name', value: vendor.restaurant_name },
                    { label: 'Cuisine', value: vendor.cuisine },
                    { label: 'Address', value: vendor.address },
                    { label: 'Landmark', value: vendor.landmark || '—' },
                    { label: 'Delivery Fee', value: `₦${Number(vendor.delivery_fee).toFixed(2)}` },
                  ].map(item => (
                    <div key={item.label} className="flex gap-2">
                      <dt className="font-medium text-gray-500 w-32 flex-shrink-0">{item.label}</dt>
                      <dd className="text-gray-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {/* Right: Restaurant Photos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImagePlus className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">Photos</h3>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                  vendorImages.length >= 3 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                }`}>
                  {vendorImages.length}/3
                </span>
              </div>

              {/* Image grid */}
              {vendorImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {vendorImages.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden h-24 bg-gray-100">
                      <img src={img.image_url} alt="Restaurant" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleDeleteImage(img)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              {vendorImages.length < 3 ? (
                <div>
                  <label className={`flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    uploadingImage ? 'border-gray-300 bg-gray-50 cursor-not-allowed' : 'border-green-400 hover:border-green-500 hover:bg-green-50'
                  }`}>
                    <ImagePlus className={`w-5 h-5 ${uploadingImage ? 'text-gray-400' : 'text-green-600'}`} />
                    <span className={`text-sm font-medium ${uploadingImage ? 'text-gray-400' : 'text-green-700'}`}>
                      {uploadingImage ? 'Uploading...' : 'Upload photo from device'}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploadingImage} onChange={handleUploadImage} className="hidden" />
                  </label>
                  {imageError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {imageError}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · Max 5MB</p>
                </div>
              ) : (
                <p className="text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                  Max 3 photos reached. Delete one to add a new photo.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
