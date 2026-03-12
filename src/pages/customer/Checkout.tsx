import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, vendorId } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
    if (vendorId) {
      fetchDeliveryFee();
    }
  }, [items, vendorId]);

  const fetchDeliveryFee = async () => {
    if (!vendorId) return;
    try {
      const { data } = await supabase
        .from('vendors')
        .select('delivery_fee')
        .eq('id', vendorId)
        .maybeSingle();
      if (data) setDeliveryFee(data.delivery_fee);
    } catch (error) {
      console.error('Error fetching delivery fee:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vendorId) return;

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          vendor_id: vendorId,
          delivery_address: formData.address,
          phone: formData.phone,
          payment_method: formData.paymentMethod,
          total_price: totalPrice + deliveryFee,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      navigate(`/orders`);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = totalPrice + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to cart
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your delivery address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="cash">Cash on Delivery</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.menu_item_id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
                      ₦{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₦{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">₦{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">₦{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
