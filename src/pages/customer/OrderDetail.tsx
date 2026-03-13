import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star, MapPin, Banknote, Utensils, CheckCircle, Clock } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  total_price: number;
  created_at: string;
  payment_method: string;
  payment_status: string;
  paystack_ref: string | null;
  vendors: {
    id: string;
    restaurant_name: string;
  };
  riders: {
    id: string;
    profiles: { name: string };
  } | null;
  order_items: {
    quantity: number;
    menu_items: {
      name: string;
    };
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    vendor_id: string | null;
    rider_id: string | null;
  }[];
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready for Pickup' },
  { key: 'picked_up', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

function getStatusProgress(status: string) {
  const index = statusSteps.findIndex((step) => step.key === status);
  return index >= 0 ? index : 0;
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [riderRating, setRiderRating] = useState(5);
  const [riderComment, setRiderComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchOrder();
    }
  }, [id, user]);

  const fetchOrder = async () => {
    if (!id || !user) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          vendors(id, restaurant_name),
          riders(id, profiles(name)),
          order_items(
            quantity,
            menu_items(name)
          ),
          reviews(id, rating, comment, vendor_id, rider_id)
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setOrder(data as any);
    } catch (error) {
      console.error('Error fetching order:', error);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user) return;

    setSubmitting(true);
    try {
      const reviewPromises = [];

      // Food/Vendor Review
      reviewPromises.push(
        (supabase.from('reviews') as any).insert({
          order_id: order.id,
          customer_id: user.id,
          vendor_id: order.vendors.id,
          rating,
          comment: comment || null,
        })
      );

      // Rider Review (if rider was assigned)
      if (order.riders) {
        reviewPromises.push(
          (supabase.from('reviews') as any).insert({
            order_id: order.id,
            customer_id: user.id,
            rider_id: order.riders.id,
            rating: riderRating,
            comment: riderComment || null,
          })
        );
      }

      const results = await Promise.all(reviewPromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      await fetchOrder();
      setShowReviewForm(false);
      setComment('');
      setRating(5);
      setRiderComment('');
      setRiderRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold mb-8 transition-all hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </button>
          <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-white text-center">
            <p className="text-gray-500 font-bold">Order not found</p>
          </div>
        </div>
      </div>
    );
  }

  const hasReview = order.reviews && order.reviews.length > 0;
  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="glass-card sticky top-20 z-50 px-4 sm:px-6 lg:px-8 py-4 mx-4 mt-4 rounded-2xl border-white/40 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold transition-all hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
            Order History
          </button>
          <div className="flex items-center gap-3">
             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
               {order.status.replace('_', ' ')}
             </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 overflow-hidden border border-white mb-10 premium-shadow">
          <div className={`p-10 border-b border-gray-50 ${isActive ? 'bg-gradient-to-br from-green-50/50 to-white' : 'bg-gray-50/30'}`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight uppercase italic">
                  {order.vendors.restaurant_name}
                </h1>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                  Ordered {new Date(order.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} at {new Date(order.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-4xl font-black text-green-600 tracking-tighter">{getSetting('currency_symbol', '₦')}{order.total_price.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="p-10">
            {isActive && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Live Delivery Status</span>
                  </div>
                  <span className="text-xs font-black text-green-600 uppercase tracking-widest">
                    {Math.round((getStatusProgress(order.status) / (statusSteps.length - 1)) * 100)}%
                  </span>
                </div>
                
                <div className="relative">
                  <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 progress-glow transition-all duration-1000"
                      style={{
                        width: `${(getStatusProgress(order.status) / (statusSteps.length - 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="relative flex justify-between">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = getStatusProgress(order.status) >= idx;
                      const isCurrent = getStatusProgress(order.status) === idx;
                      return (
                        <div key={step.key} className="flex flex-col items-center group">
                          <div
                            className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 shadow-lg ${
                              isCompleted
                                ? 'bg-green-600 text-white shadow-green-200'
                                : 'bg-white text-gray-300 border border-gray-100'
                            } ${isCurrent ? 'scale-125 ring-4 ring-green-100' : ''}`}
                          >
                            {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-[0.1em] mt-4 max-w-[60px] text-center leading-tight transition-colors ${isCompleted ? 'text-gray-900' : 'text-gray-300'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl shadow-black/5 flex flex-col sm:flex-row justify-between gap-8 mb-10 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Financial Status</p>
                <div className="flex flex-wrap gap-4">
                  <div className="px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Method:</span>
                    <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{order.payment_method}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 ${
                    order.payment_status === 'paid' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'
                  }`}>
                    <span className="text-[10px] font-black uppercase">Status:</span>
                    <span className="text-xs font-black uppercase tracking-tight">{order.payment_status}</span>
                  </div>
                </div>
              </div>
              {order.paystack_ref && (
                <div className="text-right sm:border-l border-gray-100 sm:pl-8">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ref ID</p>
                  <p className="text-xs font-bold text-gray-900 font-mono tracking-tighter">{order.paystack_ref}</p>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-10">
              <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                   <Utensils className="w-5 h-5 text-gray-400" />
                   <h2 className="font-black text-lg text-gray-900 uppercase tracking-tight">Basket</h2>
                </div>
                <ul className="space-y-4">
                  {order.order_items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center group">
                      <span className="text-gray-600 font-bold group-hover:text-gray-900 transition-colors">
                        {item.menu_items.name}
                      </span>
                      <span className="px-3 py-1 bg-white rounded-xl text-xs font-black text-green-600 border border-gray-100 shadow-sm">
                        x{item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                   <MapPin className="w-5 h-5 text-gray-400" />
                   <h2 className="font-black text-lg text-gray-900 uppercase tracking-tight">Delivery To</h2>
                </div>
                <p className="text-gray-600 font-bold leading-relaxed">{order.delivery_address}</p>
                <div className="mt-8 pt-8 border-t border-gray-100">
                   <div className="flex items-center gap-3 text-gray-400 text-xs font-black uppercase tracking-widest">
                      <Banknote className="w-4 h-4" />
                      Paid via Credit Card
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {order.status === 'delivered' && (
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 p-10 border border-white premium-shadow overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="relative">
              {hasReview ? (
                <div className="space-y-10">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Your Feedback</h2>
                  
                  {/* Food Review Display */}
                  {order.reviews.find(r => r.vendor_id) && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Food & Restaurant</p>
                        <span className="px-3 py-1 bg-yellow-400 text-white rounded-lg font-black text-[10px]">REVIEWED</span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < order.reviews.find(r => r.vendor_id)!.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {order.reviews.find(r => r.vendor_id)!.comment && (
                        <p className="text-sm text-gray-600 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                          "{order.reviews.find(r => r.vendor_id)!.comment}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivery Review Display */}
                  {order.reviews.find(r => r.rider_id) && (
                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery & Rider</p>
                        <span className="px-3 py-1 bg-blue-400 text-white rounded-lg font-black text-[10px]">REVIEWED</span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < order.reviews.find(r => r.rider_id)!.rating
                                ? 'fill-blue-400 text-blue-400'
                                : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      {order.reviews.find(r => r.rider_id)!.comment && (
                        <p className="text-sm text-gray-600 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                          "{order.reviews.find(r => r.rider_id)!.comment}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight uppercase">How was your experience?</h2>
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="w-full bg-green-600 text-white px-8 py-5 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-green-100 hover-scale flex items-center justify-center gap-3"
                    >
                      <Star className="w-5 h-5 fill-white" />
                      Rate your experience
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                      {/* Vendor Rating */}
                      <div className="space-y-4">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                          Rate the Food & Restaurant
                        </label>
                        <div className="flex gap-3">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button key={value} type="button" onClick={() => setRating(value)} className="focus:outline-none hover-scale">
                              <Star className={`w-10 h-10 transition-all ${value <= rating ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg' : 'text-gray-200'}`} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={2}
                          className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-2xl transition-all text-sm font-bold outline-none"
                          placeholder="How was the food? (Optional)"
                        />
                      </div>

                      {/* Rider Rating */}
                      {order.riders && (
                        <div className="space-y-4 pt-6 border-t border-gray-50">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                            Rate the Delivery Rider ({order.riders.profiles.name})
                          </label>
                          <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button key={value} type="button" onClick={() => setRiderRating(value)} className="focus:outline-none hover-scale">
                                <Star className={`w-10 h-10 transition-all ${value <= riderRating ? 'fill-blue-400 text-blue-400 drop-shadow-lg' : 'text-gray-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={riderComment}
                            onChange={(e) => setRiderComment(e.target.value)}
                            rows={2}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl transition-all text-sm font-bold outline-none"
                            placeholder="How was the delivery? (Optional)"
                          />
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 bg-green-600 text-white px-10 py-5 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-green-100 hover-scale"
                        >
                          {submitting ? 'Submitting...' : 'Post Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReviewForm(false);
                            setComment('');
                            setRating(5);
                          }}
                          className="bg-gray-100 text-gray-500 px-10 py-5 rounded-[2rem] hover:bg-gray-200 transition-all font-black uppercase tracking-widest hover-scale"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
