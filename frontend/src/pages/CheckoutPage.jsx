import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
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
    <section className="success-card">
      <p className="eyebrow">ORDER RECEIVED</p>
      <h1>Thank you, {order.customerName}!</h1>
      <p>Your simulated order number is <strong>#{order.id}</strong>.</p>
      <p>Status: <strong>{order.status}</strong></p>
      <p>Total: <strong>₱{Number(order.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p>
      <Link className="button" to="/account">View my orders</Link> <Link className="button" to="/">Continue shopping</Link>
    </section>
  );

  if (cart.length === 0) return <section><div className="empty-state"><h1>Your cart is empty</h1><Link className="button" to="/">Browse products</Link></div></section>;

  if (checking) return <section><p>Checking your session…</p></section>;

  if (!customer) return (
    <section>
      <div className="empty-state">
        <h1>Sign in to check out</h1>
        <p>Simulated orders are saved to a customer account so only that customer can view them.</p>
        <Link className="button" to="/account?next=/checkout">Sign in</Link>
      </div>
    </section>
  );

  return (
    <section className="checkout-layout">
      <form onSubmit={submitOrder}>
        <p className="eyebrow">SIMULATED CHECKOUT</p><h1>Delivery information</h1>
        <p className="field-hint">Use fictional details only.</p>
        <StatusMessage type="error">{error}</StatusMessage>
        <label>Full name<input name="customerName" value={values.customerName} onChange={updateField} minLength="2" maxLength="80" required /></label>
        <label>Email address<input name="email" type="email" value={values.email} onChange={updateField} required /></label>
        <label>Delivery address<textarea name="address" value={values.address} onChange={updateField} minLength="10" maxLength="300" required /></label>
        <button disabled={submitting}>{submitting ? 'Submitting order…' : 'Place simulated order'}</button>
      </form>
      <aside className="summary"><h2>Amount due</h2><p className="summary-total"><span>Total</span><strong>₱{total.toLocaleString('en-PH')}</strong></p><small>No actual payment will be collected.</small></aside>
    </section>
  );
}
