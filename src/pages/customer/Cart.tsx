import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../contexts/SettingsContext';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Utensils, Banknote } from 'lucide-react';

export function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { getSetting } = useSettings();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="glass-card sticky top-20 z-50 px-4 sm:px-6 lg:px-8 py-4 mx-4 mt-4 rounded-2xl border-white/40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold transition-all hover-scale"
            >
              <ArrowLeft className="w-5 h-5" />
              Keep Browsing
            </button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-32 text-center">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl shadow-black/5 border border-white">
            <div className="bg-orange-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
              <ShoppingBag className="w-12 h-12 text-orange-400" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Your cart is empty</h2>
            <p className="text-gray-500 font-medium mb-10 max-w-xs mx-auto text-lg leading-relaxed">
              Looks like you haven't discovered your next favorite meal yet!
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-green-600 text-white px-10 py-5 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-widest shadow-xl shadow-green-100 hover-scale flex items-center gap-3 mx-auto"
            >
              <Utensils className="w-6 h-6" />
              Browse Restaurants
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24">
      <div className="glass-card sticky top-20 z-50 px-4 sm:px-6 lg:px-8 py-4 mx-4 mt-4 rounded-2xl border-white/40 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 font-bold transition-all hover-scale"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Restaurant
          </button>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-600 flex items-center gap-2 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
            Clear
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-2 bg-green-600 rounded-full shadow-[0_0_20px_rgba(22,163,74,0.6)]" />
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Your Selection</h1>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 overflow-hidden border border-white divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.menu_item_id} className="p-8 flex items-center gap-6 group">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-28 h-28 object-cover rounded-[1.5rem] shadow-lg group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-28 h-28 bg-gray-50 rounded-[1.5rem] flex items-center justify-center border border-dashed border-gray-200">
                   <Utensils className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-black text-xl text-gray-900 mb-1 group-hover:text-green-600 transition-colors uppercase tracking-tight">{item.name}</h3>
                <p className="text-green-600 font-black text-lg tracking-tighter">
                  {getSetting('currency_symbol', '₦')}{item.price.toFixed(2)}
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-1 bg-gray-50 rounded-2xl p-1 border border-gray-100">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-red-50 hover:text-red-500 shadow-sm flex items-center justify-center transition-all border border-gray-100"
                    >
                      <Minus className="w-4 h-4 stroke-[3]" />
                    </button>
                    <span className="font-black w-10 text-center text-lg">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-white hover:bg-green-50 hover:text-green-600 shadow-sm flex items-center justify-center transition-all border border-gray-100"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <p className="font-black text-2xl text-gray-900 tracking-tighter">
                  {getSetting('currency_symbol', '₦')}{(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.menu_item_id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                  title="Remove item"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-[3rem] p-10 mt-10 border-white/60 premium-shadow">
          <div className="flex items-center justify-between text-3xl font-black mb-8">
            <span className="text-gray-400 uppercase tracking-widest text-sm">Grand Total</span>
            <span className="text-green-600 tracking-tighter">{getSetting('currency_symbol', '₦')}{totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-green-600 text-white py-6 rounded-[2rem] hover:bg-green-700 transition-all font-black uppercase tracking-[0.2em] shadow-xl shadow-green-100 flex items-center justify-center gap-4 hover-scale active:scale-95"
          >
            <Banknote className="w-6 h-6" />
            Proceed to Checkout
          </button>
          <p className="text-center text-gray-400 text-xs mt-6 font-bold uppercase tracking-widest">
            Taxes and delivery fee calculated at next step
          </p>
        </div>
      </div>
    </div>
  );
}
