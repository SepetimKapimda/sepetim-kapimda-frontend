import { create } from "zustand";
import {
  addCartItem,
  clearCartRequest,
  fetchCart as fetchCartRequest,
  removeCartItem,
  updateCartItem,
  type ApiCart,
} from "@/lib/api/cart";

export interface CartLineItem {
  cartItemId: number;
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  itemTotal: number;
}

interface CartState {
  items: CartLineItem[];
  cartTotal: number;
  isOpen: boolean;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Oturum kapanınca sunucuya istek atmadan yerel state'i sıfırlar. */
  resetCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

function mapApiCart(cart: ApiCart): { items: CartLineItem[]; cartTotal: number } {
  return {
    items: cart.items.map((item) => ({
      cartItemId: item.id,
      productId: item.product.id,
      name: item.product.name,
      price: Number(item.product.selling_price),
      image: item.product.image || "https://placehold.co/200x200.png",
      quantity: item.quantity,
      itemTotal: Number(item.item_total),
    })),
    cartTotal: Number(cart.cart_total),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  cartTotal: 0,
  isOpen: false,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await fetchCartRequest();
      set({ ...mapApiCart(cart), isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addItem: async (productId, quantity = 1) => {
    const cart = await addCartItem(productId, quantity);
    set({ ...mapApiCart(cart) });
  },

  updateQuantity: async (cartItemId, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(cartItemId);
      return;
    }
    const cart = await updateCartItem(cartItemId, quantity);
    set({ ...mapApiCart(cart) });
  },

  removeItem: async (cartItemId) => {
    await removeCartItem(cartItemId);
    // Silme ucu 204 döner, güncel sepeti almak için yeniden çekiyoruz.
    await get().fetchCart();
  },

  clearCart: async () => {
    await clearCartRequest();
    set({ items: [], cartTotal: 0 });
  },

  resetCart: () => set({ items: [], cartTotal: 0 }),

  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
}));
