import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Star } from 'lucide-react';

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
      setOrder(data);
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
      const { error } = await supabase.from('reviews').insert({
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </button>
          <p className="text-gray-500">Order not found</p>
        </div>
      </div>
    );
  }

  const hasReview = order.reviews && order.reviews.length > 0;
  const review = hasReview ? order.reviews[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {order.vendors.restaurant_name}
              </h1>
              <p className="text-gray-600">
                {new Date(order.created_at).toLocaleDateString()} at{' '}
                {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
            <p className="text-3xl font-bold text-green-600">₦{order.total_price.toFixed(2)}</p>
          </div>

          <div className="border-t pt-4">
            <h2 className="font-bold text-lg mb-3">Items</h2>
            <ul className="space-y-2">
              {order.order_items.map((item, idx) => (
                <li key={idx} className="text-gray-700">
                  {item.menu_items.name} x{item.quantity}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
            <p className="text-gray-900">{order.delivery_address}</p>
          </div>
        </div>

        {order.status === 'delivered' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {hasReview ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Your Review</h2>
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < review!.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-bold">{review!.rating}/5</span>
                </div>
                {review!.comment && <p className="text-gray-700">{review!.comment}</p>}
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Leave a Review</h2>
                {!showReviewForm ? (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Write Review
                  </button>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-8 h-8 cursor-pointer ${
                                value <= rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comment (Optional)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Share your experience..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        Submit Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReviewForm(false);
                          setComment('');
                          setRating(5);
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
