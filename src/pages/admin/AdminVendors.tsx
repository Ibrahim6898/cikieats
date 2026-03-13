import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, CheckCircle, XCircle, Trash2,
  PauseCircle, PlayCircle, Store
} from 'lucide-react';

interface Vendor {
  id: string;
  restaurant_name: string;
  cuisine: string;
  address: string;
  delivery_fee: number;
  status: string;
  is_open: boolean;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

export function AdminVendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // tracks which vendor is being actioned
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
      setVendors(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToVendors = () => {
    const channel = supabase
      .channel('vendors_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, fetchVendors)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const updateStatus = async (vendorId: string, newStatus: string) => {
    setActionLoading(vendorId + newStatus);
    try {
      const { error } = await (supabase.from('vendors') as any)
        .update({ status: newStatus })
        .eq('id', vendorId);
      if (error) throw error;
      await fetchVendors();
    } catch (err) {
      console.error('Error updating vendor:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteVendor = async (vendorId: string) => {
    setActionLoading(vendorId + 'delete');
    try {
      const { error } = await (supabase.from('vendors') as any)
        .delete()
        .eq('id', vendorId);
      if (error) throw error;
      setConfirmDelete(null);
      await fetchVendors();
    } catch (err) {
      console.error('Error deleting vendor:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':   return 'bg-green-100 text-green-700';
      case 'rejected':   return 'bg-red-100 text-red-700';
      case 'pending':    return 'bg-yellow-100 text-yellow-700';
      case 'suspended':  return 'bg-orange-100 text-orange-700';
      default:           return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredVendors = filter === 'all'
    ? vendors
    : vendors.filter(v => v.status === filter);

  const counts = {
    all: vendors.length,
    pending: vendors.filter(v => v.status === 'pending').length,
    approved: vendors.filter(v => v.status === 'approved').length,
    rejected: vendors.filter(v => v.status === 'rejected').length,
    suspended: vendors.filter(v => v.status === 'suspended').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin')}
              className="p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition border border-gray-100 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                Vendor <span className="text-green-600">Management</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform Partners & Applications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-3 mb-10">
          {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                filter === tab
                  ? 'bg-black text-white shadow-lg shadow-black/20 scale-105'
                  : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {tab} <span className={`ml-2 opacity-50 ${filter === tab ? 'text-green-400' : ''}`}>({counts[tab]})</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            Error loading vendors: {error}
          </div>
        )}

        <div className="space-y-4">
          {filteredVendors.length === 0 ? (
            <div className="glass-card rounded-[40px] p-20 text-center">
              <Store className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-lg font-black text-gray-400 uppercase tracking-widest">No vendors found in this category</p>
            </div>
          ) : (
            filteredVendors.map((vendor) => (
              <div 
                key={vendor.id} 
                className="glass-card rounded-[32px] p-8 premium-shadow hover:scale-[1.01] transition-all duration-300 border border-white/50 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  {/* Info Section */}
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 group-hover:bg-green-50 group-hover:border-green-100 transition-colors">
                      <Store className="w-8 h-8 text-gray-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                        {vendor.restaurant_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                          {vendor.cuisine}
                        </span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-xs font-bold text-gray-500">{vendor.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Data */}
                  <div className="flex items-center gap-12 px-8 py-4 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Owner Contact</p>
                      <p className="text-xs font-black text-gray-900 tracking-tight">{vendor.profiles?.name || 'Unknown'}</p>
                      <p className="text-[10px] font-bold text-gray-500 italic lowercase">{vendor.profiles?.email || '—'}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Delivery Fee</p>
                      <p className="text-sm font-black text-gray-900">₦{Number(vendor.delivery_fee).toFixed(0)}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusBadge(vendor.status)} shadow-sm`}>
                        {vendor.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-3">
                    {vendor.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(vendor.id, 'approved')}
                          disabled={!!actionLoading}
                          className="flex items-center justify-center p-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition shadow-lg shadow-green-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateStatus(vendor.id, 'rejected')}
                          disabled={!!actionLoading}
                          className="flex items-center justify-center p-4 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {vendor.status === 'approved' && (
                      <button
                        onClick={() => updateStatus(vendor.id, 'suspended')}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center p-4 bg-orange-100 text-orange-600 rounded-2xl hover:bg-orange-200 transition group/action disabled:opacity-50"
                      >
                        <PauseCircle className="w-5 h-5" />
                      </button>
                    )}

                    {(vendor.status === 'rejected' || vendor.status === 'suspended') && (
                      <button
                        onClick={() => updateStatus(vendor.id, 'approved')}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center p-4 bg-green-100 text-green-600 rounded-2xl hover:bg-green-200 transition disabled:opacity-50"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </button>
                    )}

                    {confirmDelete === vendor.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteVendor(vendor.id)}
                          disabled={!!actionLoading}
                          className="px-4 py-2.5 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-50"
                        >
                          {actionLoading === vendor.id + 'delete' ? 'Wait' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(vendor.id)}
                        className="flex items-center justify-center p-4 text-gray-300 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-5 h-5" />
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
  );
}
