import { useState } from 'react';
import { Link } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps.jsx';
import OrderConfirmation from '../components/OrderConfirmation.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

const ADDRESS_MAX = 300;

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export default function CheckoutPage() {
  const { cart, total, itemCount, clearCart } = useCart();
  const { customer, checking } = useAuth();
  const [form, setForm] = useState({ customerName: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  // Prefill from the signed-in account; the customer may still edit the delivery details.
  const values = {
    customerName: form.customerName || customer?.name || '',
    email: form.email || customer?.email || '',
    address: form.address
  };

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (error) setError('');
  }

  async function submitOrder(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createOrder({
        ...values,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      });
      setOrder(created);
      clearCart();
    } catch (caught) {
      setError(caught.status === 401 ? 'Your session ended. Sign in again to place the order.' : caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return (
    <section className="checkout-page">
      <CheckoutSteps current={3} />
      <OrderConfirmation order={order} />
    </section>
  );

  if (cart.length === 0) return (
    <section className="checkout-page">
      <div className="checkout-gate">
        <span className="checkout-gate-icon" aria-hidden="true">🛒</span>
        <h1>Your cart is empty</h1>
        <p className="field-hint">Add a product before checking out.</p>
        <Link className="button" to="/">Browse products</Link>
      </div>
    </section>
  );

  if (checking) return <section className="checkout-page"><p className="auth-checking">Checking your session…</p></section>;

  if (!customer) return (
    <section className="checkout-page">
      <CheckoutSteps current={1} />
      <div className="checkout-gate">
        <span className="checkout-gate-icon" aria-hidden="true">🔒</span>
        <h1>Sign in to check out</h1>
        <p className="field-hint">
          Your cart ({itemCount} {itemCount === 1 ? 'item' : 'items'}, {peso(total)}) is kept. Orders are saved to your
          account so only you can see them.
        </p>
        <div className="order-success-actions">
          <Link className="button" to="/account?next=/checkout">Sign in</Link>
          <Link className="button secondary" to="/cart">Back to cart</Link>
        </div>
      </div>
    </section>
  );

  return (
    <section className="checkout-page">
      <CheckoutSteps current={1} />
      <div className="checkout-grid">
        <form id="checkout-form" className="checkout-card" onSubmit={submitOrder}>
          <div className="checkout-account">
            <span className="avatar small" aria-hidden="true">{initials(customer.name)}</span>
            <span>Ordering as <strong>{customer.name}</strong><br /><small>{customer.email}</small></span>
            <Link to="/account">Not you?</Link>
          </div>

          <h1>Delivery details</h1>
          <p className="field-hint">Classroom demo: use fictional details only.</p>
          <StatusMessage type="error">{error}</StatusMessage>

          <label>
            Full name
            <input name="customerName" autoComplete="name" value={values.customerName} onChange={updateField} minLength="2" maxLength="80" required />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" value={values.email} onChange={updateField} required />
            <span className="input-hint">We'd send the order confirmation here.</span>
          </label>
          <label>
            Delivery address
            <textarea
              name="address" autoComplete="street-address" rows={3}
              placeholder="House no., street, barangay, city, province"
              value={values.address} onChange={updateField} minLength="10" maxLength={ADDRESS_MAX} required
            />
            <span className="input-hint">{values.address.trim().length}/{ADDRESS_MAX} · at least 10 characters</span>
          </label>

          <div className="payment-option" role="note">
            <span className="payment-radio" aria-hidden="true" />
            <span><strong>Simulated payment</strong><br /><small>No card or money is needed. Nothing will be charged.</small></span>
          </div>
        </form>

        <aside className="checkout-summary">
          <div className="checkout-summary-head">
            <h2>Order summary</h2>
            <Link to="/cart">Edit cart</Link>
          </div>
          <ul className="summary-items">
            {cart.map((item) => (
              <li key={item.productId}>
                <span className="summary-qty">{item.quantity}×</span>
                <span className="summary-name">{item.name}<small>{peso(item.price)} each</small></span>
                <span>{peso(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-lines">
            <p><span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><span>{peso(total)}</span></p>
            <p><span>Delivery</span><span className="free">Free</span></p>
            <p className="summary-grand"><span>Total</span><strong>{peso(total)}</strong></p>
          </div>
          <button form="checkout-form" className="full" disabled={submitting}>
            {submitting ? 'Placing order…' : `Place simulated order · ${peso(total)}`}
          </button>
          <small className="summary-note">Prices and stock are checked again by the server when you place the order.</small>
        </aside>
      </div>
    </section>
  );
}
