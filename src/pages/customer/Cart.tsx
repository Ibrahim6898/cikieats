import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to restaurants
            </button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some delicious items to get started</p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Cart</h1>

        <div className="bg-white rounded-xl shadow-sm divide-y">
          {items.map((item) => (
            <div key={item.menu_item_id} className="p-6 flex gap-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                <p className="text-green-600 font-medium mt-1">
                  ₦{item.price.toFixed(2)}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-gray-900">
                  ₦{(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.menu_item_id)}
                  className="text-red-600 hover:text-red-700 text-sm mt-2"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between text-xl font-bold">
            <span>Total</span>
            <span className="text-green-600">₦{totalPrice.toFixed(2)}</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition font-medium mt-6"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
