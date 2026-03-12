import { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  menu_item_id: string;
  vendor_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  vendorId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const vendorId = items.length > 0 ? items[0].vendor_id : null;

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      if (prev.length > 0 && prev[0].vendor_id !== item.vendor_id) {
        if (!confirm('Adding items from a different restaurant will clear your cart. Continue?')) {
          return prev;
        }
        return [{ ...item, quantity: 1 }];
      }

      const existing = prev.find((i) => i.menu_item_id === item.menu_item_id);
      if (existing) {
        return prev.map((i) =>
          i.menu_item_id === item.menu_item_id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menu_item_id !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.menu_item_id === menuItemId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        vendorId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
