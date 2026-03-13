import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Bike, ShoppingBag, Wallet, ToggleLeft, ToggleRight, PauseCircle, Mail, XCircle, TrendingUp, MessageCircle, Phone, Star } from 'lucide-react';

interface Rider {
  id: string;
  status: string;
  is_online: boolean;
  vehicle_type: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { name: string };
}

export function RiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableDeliveriesCount, setAvailableDeliveriesCount] = useState<number>(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [formData, setFormData] = useState({
    vehicle_type: 'bicycle' as const,
    phone_number: '',
  });

  useEffect(() => {
    if (user) {
      fetchRider();
    }
  }, [user]);

  const fetchRider = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase
        .from('riders') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setRider(data as any);
      if ((data as any)?.status === 'approved') {
        fetchAvailableDeliveries();
        fetchRiderStats(data.id);
      }
    } catch (error) {
      console.error('Error fetching rider:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDeliveries = async () => {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready')
      .is('rider_id', null);
    setAvailableDeliveriesCount(count || 0);
  };

  const fetchRiderStats = async (riderId: string) => {
    try {
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(name)')
        .eq('rider_id', riderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const riderReviews = (reviewsData || []) as Review[];
      setReviews(riderReviews.slice(0, 5));
      
      if (riderReviews.length > 0) {
        const total = riderReviews.reduce((sum, r) => sum + r.rating, 0);
        setAvgRating(total / riderReviews.length);
      }
    } catch (err) {
      console.error('Error fetching rider stats:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { error } = await (supabase.from('riders') as any).insert({
        user_id: user.id,
        vehicle_type: formData.vehicle_type,
        phone: formData.phone_number,
        status: 'pending',
        is_online: false,
      });

      if (error) throw error;
      fetchRider();
    } catch (error) {
      console.error('Error creating rider profile:', error);
      alert('Failed to create rider profile');
    }
  };

  const toggleOnline = async () => {
    if (!rider) return;
    try {
      const { error } = await (supabase
        .from('riders') as any)
        .update({ is_online: !rider.is_online })
        .eq('id', rider.id);

      if (error) throw error;
      setRider({ ...rider, is_online: !rider.is_online });
    } catch (error) {
      console.error('Error toggling online status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-screen bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="glass-card rounded-[40px] p-10 premium-shadow border border-white/50 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 rotate-3 hover:rotate-6 transition-transform">
              <Bike className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-4">Join the Fleet</h1>
            <p className="text-gray-500 font-bold mb-10 leading-relaxed">
              Become a CIKIEats rider and start earning today. Flexible hours, instant payouts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Vehicle Type</label>
                <select
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleChange}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-[20px] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900 appearance-none cursor-pointer"
                >
                  <option value="bicycle">Bicycle</option>
                  <option value="motorbike">Motorbike</option>
                  <option value="car">Car</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+234..."
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-[20px] focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all font-bold text-gray-900"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-green-700 transition-all premium-shadow active:scale-[0.98] mt-4"
              >
                Apply to Deliver
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (rider.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="glass-card rounded-[40px] p-12 max-w-lg text-center premium-shadow border border-white/50 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-red-100">
            <PauseCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-6 leading-none">Account Suspended</h2>
          <p className="text-gray-500 font-bold mb-10 leading-relaxed">
            Your delivery account has been suspended by the administration. 
            You will not be able to receive new delivery requests during this time.
          </p>
          <div className="pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Need assistance?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={`mailto:${getSetting('support_email')}?subject=Rider Suspension Inquiry: ${user?.email || 'Rider'} (${rider.id})`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-black rounded-[24px] hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-95 uppercase text-xs"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </a>
              <a
                href={`https://wa.me/${getSetting('support_whatsapp')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#25D366] text-white font-black rounded-[24px] hover:bg-[#128C7E] transition-all shadow-xl shadow-green-100 active:scale-95 uppercase text-xs"
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

  if (rider.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="glass-card rounded-[40px] p-12 max-w-lg text-center premium-shadow border border-white/50 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-orange-100">
            <AlertCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-6 leading-none">Application Pending</h2>
          <p className="text-gray-500 font-bold mb-10 leading-relaxed">
            Your application is currently being reviewed by our team. 
            We'll notify you via email once your account is activated.
          </p>
          <div className="pt-8 border-t border-gray-50 flex flex-col items-center gap-3">
             <a
              href={`mailto:${getSetting('support_email')}?subject=Rider Application Status: ${user?.email || 'Rider'}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 text-white font-black rounded-[20px] hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 uppercase text-xs tracking-widest"
            >
              <Mail className="w-4 h-4" />
              Check Status via Email
            </a>
            <a
              href={`tel:${getSetting('support_phone')}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white border border-gray-200 text-gray-900 font-black rounded-[20px] hover:bg-gray-50 transition-all active:scale-95 uppercase text-xs tracking-widest"
            >
              <Phone className="w-4 h-4" />
              Call Registry
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (rider.status === 'rejected') {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="glass-card rounded-[40px] p-12 max-w-lg text-center premium-shadow border border-white/50 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-red-100">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-6 leading-none">Application Declined</h2>
          <p className="text-gray-500 font-bold mb-10 leading-relaxed">
            Unfortunately, your application to join the delivery fleet could not be approved at this time.
          </p>
           <div className="pt-8 border-t border-gray-50">
             <a
              href={`mailto:${getSetting('support_email')}?subject=Rider Rejection Inquiry: ${user?.email || 'Rider'}`}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gray-900 text-white font-black rounded-[20px] hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 uppercase text-xs tracking-widest"
            >
              <Mail className="w-4 h-4" />
              Request Clarification
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="navbar-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-green-600 rounded-2xl shadow-lg shadow-green-100 rotate-3">
                 <Bike className="w-8 h-8 text-white" />
               </div>
               <div>
                 <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Rider Hub</h1>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Operational Control</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                rider.is_online ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full ${rider.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-xs font-black uppercase tracking-widest">{rider.is_online ? 'Status: Active' : 'Status: Offline'}</span>
                <button
                  onClick={toggleOnline}
                  className="ml-4 p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md active:scale-90 transition-all"
                >
                  {rider.is_online ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <button
            onClick={() => navigate('/rider/orders')}
            className="glass-card rounded-[32px] p-8 text-left premium-shadow hover:scale-[1.02] transition-transform duration-300 group border border-white/50"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:rotate-6 transition-transform">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Pool</p>
                <p className="text-2xl font-black text-blue-600">{availableDeliveriesCount}</p>
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Deliveries</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Available Jobs</p>
          </button>

          <button
            onClick={() => navigate('/rider/earnings')}
            className="glass-card rounded-[32px] p-8 text-left premium-shadow hover:scale-[1.02] transition-transform duration-300 group border border-white/50"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-green-50 rounded-2xl text-green-600 group-hover:rotate-6 transition-transform">
                <Wallet className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 text-green-200" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Earnings</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">View Payouts</p>
          </button>

          <div className="glass-card rounded-[32px] p-8 premium-shadow border border-white/50">
             <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 group-hover:rotate-6 transition-transform">
                <Bike className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-2">{rider.vehicle_type}</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Registered Vehicle</p>
          </div>

          <div className="glass-card rounded-[32px] p-8 premium-shadow border border-white/50">
             <div className="flex items-center justify-between mb-8">
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600 group-hover:rotate-6 transition-transform">
                <Star className="w-8 h-8" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rating</p>
                <p className="text-2xl font-black text-purple-600">{avgRating.toFixed(1)}</p>
              </div>
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-2">Feedback</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{reviews.length} Reviews</p>
          </div>
        </div>

        <div className="glass-card rounded-[40px] p-12 premium-shadow border border-white/50 text-center bg-gray-900/5">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-6 leading-none">Real-Time Dispatch</h2>
            <p className="text-gray-500 font-bold mb-10 leading-relaxed">
              When you're online, available orders in your area will appear here. 
              Ensure your notifications are enabled to catch peak-hour bonuses.
            </p>
            <button
              onClick={() => navigate('/rider/orders')}
              className="px-12 py-5 bg-gray-900 text-white font-black rounded-[24px] uppercase tracking-widest hover:bg-black transition-all premium-shadow active:scale-95"
            >
              Enter Work Pool
            </button>
          </div>
        </div>

        {/* Recent Feedback Section */}
        {reviews.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none Italics italic">Customer Feedback</h2>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-black text-gray-900">{avgRating.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="glass-card rounded-3xl p-6 border border-white/50 premium-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">{review.profiles.name}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-bold italic leading-relaxed">
                    "{review.comment || 'Safe and quick delivery!'}"
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
