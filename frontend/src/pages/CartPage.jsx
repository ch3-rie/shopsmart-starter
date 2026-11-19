import { Link } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const LOW_STOCK = 3;

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function messageType(message) {
  return message.startsWith('Only') || message.includes('could not') || message.startsWith('Quantity') ? 'error' : 'info';
}

export default function CartPage() {
  const { cart, total, cartMessage, setQuantity, removeFromCart, itemCount } = useCart();
  const { customer } = useAuth();

  if (cart.length === 0) return (
    <section className="cart-page">
      <div className="checkout-gate">
        <span className="checkout-gate-icon" aria-hidden="true">🛒</span>
        <h1>Your cart is empty</h1>
        <p className="field-hint">
          {customer ? 'Items you add are saved to your account.' : 'Browse the catalog or ask the AI assistant for a recommendation.'}
        </p>
        <StatusMessage type={messageType(cartMessage)}>{cartMessage}</StatusMessage>
        <div className="order-success-actions">
          <Link className="button" to="/">Browse products</Link>
          <Link className="button secondary" to="/assistant">Ask the assistant</Link>
        </div>
      </div>
    </section>
  );

  return (
    <section className="cart-page">
      <CheckoutSteps current={0} />
      <div className="cart-title">
        <h1>Your cart</h1>
        <span className="field-hint">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
      </div>
      <StatusMessage type={messageType(cartMessage)}>{cartMessage}</StatusMessage>

      <div className="checkout-grid">
        <ul className="cart-lines">
          {cart.map((item) => (
            <li className="cart-line" key={item.productId}>
              <div className="cart-line-info">
                <Link className="cart-line-name" to={`/products/${item.productId}`}>{item.name}</Link>
                <span className="field-hint">{peso(item.price)} each</span>
                {item.stock <= LOW_STOCK && <span className="stock-note">Only {item.stock} left</span>}
              </div>

              <div className="qty-stepper" role="group" aria-label={`Quantity of ${item.name}`}>
                <button
                  type="button" onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1} aria-label={`Decrease quantity of ${item.name}`}
                >−</button>
                <input
                  type="number" min="1" max={item.stock} value={item.quantity} aria-label={`Quantity of ${item.name}`}
                  onChange={(event) => setQuantity(item.productId, Number(event.target.value))}
                />
                <button
                  type="button" onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock} aria-label={`Increase quantity of ${item.name}`}
                >+</button>
              </div>

              <strong className="cart-line-total">{peso(item.price * item.quantity)}</strong>

              <button type="button" className="link-button" onClick={() => removeFromCart(item.productId)} aria-label={`Remove ${item.name} from cart`}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="checkout-summary">
          <div className="checkout-summary-head"><h2>Order summary</h2></div>
          <div className="summary-lines">
            <p><span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><span>{peso(total)}</span></p>
            <p><span>Delivery</span><span className="free">Free</span></p>
            <p className="summary-grand"><span>Total</span><strong>{peso(total)}</strong></p>
          </div>
          <Link className="button full" to="/checkout">Proceed to checkout</Link>
          <Link className="cart-continue" to="/">← Continue shopping</Link>
          <small className="summary-note">
            {customer ? `Saved to ${customer.name}'s account.` : 'Sign in at checkout to save this cart to your account.'}
          </small>
        </aside>
      </div>
    </section>
  );
}
