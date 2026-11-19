import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { api } from '../services/api.js';
import {
  addProductToCart, calculateCartItemCount,
  calculateCartTotal, mergeCarts, updateCartQuantity
} from '../utils/cart.js';

const CartContext = createContext(null);
const SAVE_DELAY_MS = 400;

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartMessage, setCartMessage] = useState('');
  const { customer } = useAuth();
  const customerId = customer?.id ?? null;
  // The customer whose saved cart has been loaded. Saving waits until this
  // matches, so an empty tab never overwrites a saved cart before it loads.
  const loadedFor = useRef(null);

  // On sign-in (or a page refresh while signed in): load the saved cart and
  // merge in anything added as a guest.
  useEffect(() => {
    loadedFor.current = null;
    if (!customerId) return undefined;
    let active = true;
    api.getCart()
      .then((data) => {
        if (!active) return;
        const saved = data?.items ?? [];
        setCart((localCart) => mergeCarts(saved, localCart));
        loadedFor.current = customerId;
        if (saved.length > 0) setCartMessage('Your saved cart was restored.');
      })
      .catch(() => {
        if (active) setCartMessage('Your saved cart could not be loaded. Items in this tab are not being saved.');
      });
    return () => { active = false; };
  }, [customerId]);

  // While signed in: save every change, shortly after the last one.
  useEffect(() => {
    if (!customerId || loadedFor.current !== customerId) return undefined;
    const timer = setTimeout(() => {
      api.saveCart(cart.map(({ productId, quantity }) => ({ productId, quantity })))
        .catch(() => setCartMessage('Your cart could not be saved right now. It is still in this tab.'));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [cart, customerId]);

  function addToCart(product) {
    setCart((currentCart) => {
      const result = addProductToCart(currentCart, product);
      setCartMessage(result.error || `${product.name} was added to your cart.`);
      return result.cart;
    });
  }

  function setQuantity(productId, quantity) {
    setCart((currentCart) => {
      const result = updateCartQuantity(currentCart, productId, quantity);
      setCartMessage(result.error);
      return result.cart;
    });
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
    setCartMessage('Item removed from cart.');
  }

  // Clears this tab only. After sign-out the saved cart stays on the server for
  // the next sign-in; after an order the server has already emptied it.
  function clearCart() {
    setCart([]);
    setCartMessage('');
  }

  const value = useMemo(() => ({
    cart,
    cartMessage,
    itemCount: calculateCartItemCount(cart),
    total: calculateCartTotal(cart),
    addToCart,
    setQuantity,
    removeFromCart,
    clearCart
  }), [cart, cartMessage]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}
