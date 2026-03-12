import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Store, Menu, ShoppingBag, AlertCircle,
  ToggleLeft, ToggleRight, ImagePlus, X
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
  const [formData, setFormData] = useState({
    restaurant_name: '',
    cuisine: '',
    address: '',
    landmark: '',
    delivery_fee: '0',
  });

  // Image management state
  const [vendorImages, setVendorImages] = useState<VendorImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVendor();
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

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!vendor) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    if (vendorImages.length >= 3) {
      setImageError('You can only add up to 3 restaurant images.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be smaller than 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-images')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-images')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('vendor_images').insert({
        vendor_id: vendor.id,
        image_url: publicUrl,
        display_order: vendorImages.length,
      } as any);

      if (dbError) throw dbError;
      await fetchImages(vendor.id);
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      // Reset the input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (img: VendorImage) => {
    if (!vendor) return;
    try {
      // Extract storage path from the public URL and delete from storage
      const url = new URL(img.image_url);
      const pathParts = url.pathname.split('/vendor-images/');
      if (pathParts[1]) {
        await supabase.storage.from('vendor-images').remove([pathParts[1]]);
      }
      // Delete from DB
      const { error } = await supabase
        .from('vendor_images')
        .delete()
        .eq('id', img.id);
      if (error) throw error;
      await fetchImages(vendor.id);
    } catch (err) {
      console.error('Error deleting image:', err);
    }
  };

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

      if (error) {
        console.error('Vendor creation error:', error);
        throw new Error(`Failed to create restaurant: ${error.message}`);
      }
      await fetchVendor();
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      setError(error.message || 'Please try again.');
      alert(`Failed to create restaurant: ${error.message || 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-gray-600 mb-6">
              Fill in the details below to get started on CIKIEats
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  name="restaurant_name"
                  required
                  value={formData.restaurant_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuisine Type
                </label>
                <input
                  type="text"
                  name="cuisine"
                  required
                  value={formData.cuisine}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Italian, Chinese, Fast Food"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Fee (₦)
                </label>
                <input
                  type="number"
                  name="delivery_fee"
                  required
                  min="0"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
          <p className="text-gray-600">
            Your restaurant registration is awaiting admin approval. You'll be notified once
            your account is approved.
          </p>
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
          <p className="text-gray-600">
            Unfortunately, your restaurant application was not approved. Please contact support
            for more information.
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
            <h1 className="text-2xl font-bold text-gray-900">{vendor.restaurant_name}</h1>
            <button
              onClick={toggleOpen}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                vendor.is_open
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {vendor.is_open ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  Open
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  Closed
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/vendor/menu')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <Menu className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Menu Management</h3>
            <p className="text-gray-600">Add, edit, and manage your menu items</p>
          </button>

          <button
            onClick={() => navigate('/vendor/orders')}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition text-left"
          >
            <ShoppingBag className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Orders</h3>
            <p className="text-gray-600">View and manage incoming orders</p>
          </button>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <Store className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Info</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">Cuisine:</span> {vendor.cuisine}
              </p>
              <p>
                <span className="font-medium">Address:</span> {vendor.address}
              </p>
              <p>
                <span className="font-medium">Delivery Fee:</span> ₦{vendor.delivery_fee}
              </p>
            </div>
          </div>
        </div>

        {/* Restaurant Images */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <ImagePlus className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Restaurant Photos</h2>
            <span className={`ml-auto text-sm font-medium px-3 py-1 rounded-full ${
              vendorImages.length >= 3
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-700'
            }`}>
              {vendorImages.length}/3 images
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Add up to 3 photos of your restaurant. These will be shown to customers on the app.
            Use a direct image URL (e.g., from Unsplash or Imgur).
          </p>

          {/* Current Images */}
          {vendorImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {vendorImages.map((img) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden h-40 bg-gray-100">
                  <img
                    src={img.image_url}
                    alt="Restaurant"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={() => handleDeleteImage(img)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 text-white text-xs px-2 py-1">
                    Photo {img.display_order + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Image */}
          {vendorImages.length < 3 ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Upload a Photo
              </label>
              <label
                className={`flex items-center justify-center gap-3 w-full py-4 px-6 border-2 border-dashed rounded-xl cursor-pointer transition ${
                  uploadingImage
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-green-400 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <ImagePlus className={`w-6 h-6 ${uploadingImage ? 'text-gray-400' : 'text-green-600'}`} />
                <span className={`font-medium ${uploadingImage ? 'text-gray-400' : 'text-green-700'}`}>
                  {uploadingImage ? 'Uploading...' : 'Click to choose a photo from your device'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploadingImage}
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
              {imageError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {imageError}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Supported formats: JPG, PNG, WEBP, GIF · Max size: 5MB
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Maximum of 3 images reached. Delete one to add a new photo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
