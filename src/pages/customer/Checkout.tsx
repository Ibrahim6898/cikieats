import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MapPin, Phone, CreditCard, Banknote, ShieldCheck } from 'lucide-react';

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
        .eq('id', vendorId as any)
        .maybeSingle();
      if (data) setDeliveryFee((data as any).delivery_fee || 0);
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
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: (orderData as any).id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any);

      if (itemsError) throw itemsError;

      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = totalPrice + deliveryFee;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <div className="glass-card sticky top-20 z-50 px-4 sm:px-6 lg:px-8 py-4 mx-4 mt-4 rounded-2xl border-white/40 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold transition-all hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to Cart
          </button>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-xl border border-green-100">
             <ShieldCheck className="w-4 h-4 text-green-600" />
             <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-2 bg-green-600 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.6)]" />
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Final Details</h1>
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 p-10 border border-white space-y-8">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Where should we bring it?
                </label>
                <div className="relative group">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-[1.5rem] focus:ring-4 focus:ring-green-500/5 transition-all outline-none font-bold text-gray-900"
                    placeholder="Enter full delivery address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Contact Number
                </label>
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-green-500 rounded-[1.5rem] focus:ring-4 focus:ring-green-500/5 transition-all outline-none font-bold text-gray-900"
                    placeholder="Driver may call you on this"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
                  Payment Preference
                </label>
                <div className="grid grid-cols-2 gap-4">
                   <button
                     type="button"
                     onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
                     className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 ${formData.paymentMethod === 'cash' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                   >
                     <div className={`p-3 rounded-xl ${formData.paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Banknote className="w-6 h-6" />
                     </div>
                     <span className={`font-black uppercase tracking-widest text-[10px] ${formData.paymentMethod === 'cash' ? 'text-green-700' : 'text-gray-400'}`}>Cash on Delivery</span>
                   </button>
                   <button
                     type="button"
                     onClick={() => setFormData({...formData, paymentMethod: 'card'})}
                     className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 ${formData.paymentMethod === 'card' ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                   >
                     <div className={`p-3 rounded-xl ${formData.paymentMethod === 'card' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <CreditCard className="w-6 h-6" />
                     </div>
                     <span className={`font-black uppercase tracking-widest text-[10px] ${formData.paymentMethod === 'card' ? 'text-green-700' : 'text-gray-400'}`}>Credit Card</span>
                   </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-6 rounded-[1.5rem] hover:bg-green-700 transition-all font-black uppercase tracking-[0.2em] shadow-xl shadow-green-100 hover-scale active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing Order...' : 'Confirm and Order Now'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="glass-card rounded-[3rem] p-10 border-white/60 shadow-2xl shadow-black/5 sticky top-40">
              <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight uppercase italic">Summary</h2>
              <div className="space-y-6">
                <div className="max-h-60 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {items.map((item) => (
                    <div key={item.menu_item_id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-black text-gray-900 ml-4">₦{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-400 uppercase tracking-widest text-[10px]">Basket Total</span>
                    <span className="text-gray-900">₦{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-400 uppercase tracking-widest text-[10px]">Delivery Fee</span>
                    <span className="text-gray-900">₦{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="pt-6 border-t border-gray-100 flex justify-between items-end">
                    <div>
                       <p className="text-gray-400 uppercase tracking-widest text-[10px] font-black mb-1">Total to Pay</p>
                       <p className="text-4xl font-black text-green-600 tracking-tighter leading-none">₦{grandTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 p-6 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                 </div>
                 <p className="text-[10px] font-bold text-green-800 leading-relaxed uppercase tracking-widest">
                    Your payment details are encrypted and 100% secure.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
