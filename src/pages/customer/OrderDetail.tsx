import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star, MapPin, Banknote, Utensils, CheckCircle, Clock } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  total_price: number;
  created_at: string;
  vendors: {
    id: string;
    restaurant_name: string;
  };
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
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
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
          order_items(
            quantity,
            menu_items(name)
          ),
          reviews(id, rating, comment)
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
      const { error } = await (supabase.from('reviews') as any).insert({
        order_id: order.id,
        customer_id: user.id,
        vendor_id: order.vendors.id,
        rating,
        comment: comment || null,
      });

      if (error) throw error;
      await fetchOrder();
      setShowReviewForm(false);
      setComment('');
      setRating(5);
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
  const review = hasReview ? order.reviews[0] : null;
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
                <p className="text-4xl font-black text-green-600 tracking-tighter">₦{order.total_price.toFixed(2)}</p>
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
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Your Feedback</h2>
                    <span className="px-4 py-1 bg-yellow-400 text-white rounded-xl font-black text-xs">REVIEWED</span>
                  </div>
                  <div className="flex items-center gap-2 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-7 h-7 transition-all ${
                          i < review!.rating
                            ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                    <span className="ml-3 font-black text-xl text-gray-900">{review!.rating}.0</span>
                  </div>
                  {review!.comment && (
                    <div className="bg-gray-50 p-6 rounded-2xl italic text-gray-600 font-medium leading-relaxed relative">
                       <span className="absolute -top-4 left-4 text-6xl text-gray-100 font-serif leading-none">“</span>
                       {review!.comment}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight uppercase">How was the food?</h2>
                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="w-full bg-green-600 text-white px-8 py-5 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-green-100 hover-scale flex items-center justify-center gap-3"
                    >
                      <Star className="w-5 h-5 fill-white" />
                      Rate your experience
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                          Your Rating
                        </label>
                        <div className="flex gap-4">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setRating(value)}
                              className="focus:outline-none hover-scale active:scale-90"
                            >
                              <Star
                                className={`w-12 h-12 cursor-pointer transition-all ${
                                  value <= rating
                                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-xl'
                                    : 'text-gray-100'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                          Care to share details? (Optional)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={4}
                          className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-[2rem] focus:ring-4 focus:ring-green-500/5 transition-all text-gray-900 placeholder-gray-300 font-bold outline-none"
                          placeholder="Tell us what you loved about it..."
                        />
                      </div>

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
