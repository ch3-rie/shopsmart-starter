import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export default function AccountPage() {
  const { customer, checking, login, logout } = useAuth();
  const { clearCart, itemCount } = useCart();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const next = searchParams.get('next') === '/checkout' ? '/checkout' : null;

  useEffect(() => {
    if (!customer) return undefined;
    let active = true;
    setOrdersLoading(true);
    api.getMyOrders()
      .then((data) => { if (active) { setOrders(data.orders); setOrdersError(''); } })
      .catch((caught) => { if (active) setOrdersError(caught.message); })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [customer]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (error) setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      setForm({ email: '', password: '' });
      setShowPassword(false);
      if (next) navigate(next);
    } catch (caught) {
      setError(caught.status === 429 ? 'Too many sign-in attempts. Wait 15 minutes, then try again.' : caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  // The cart lives in this browser tab, not in the account, so it is cleared on
  // sign-out to keep the next person on a shared computer from seeing it.
  async function signOut() {
    await logout();
    clearCart();
    setOrders([]);
  }

  if (checking) return <section className="auth-page"><p className="auth-checking">Checking your session…</p></section>;

  if (!customer) return (
    <section className="auth-page">
      <div className="auth-card">
        <aside className="auth-brand">
          <p className="eyebrow">ShopSmart account</p>
          <h1>Welcome back</h1>
          <p>Sign in to check out and keep track of your simulated orders.</p>
          <ul className="auth-benefits">
            <li>Your name and email are filled in at checkout</li>
            <li>See every order you have placed</li>
            <li>Only you can view your orders</li>
          </ul>
        </aside>

        <div className="auth-panel">
          <h2>Sign in</h2>
          {next && (
            <p className="auth-context">
              Sign in to finish checking out. Your cart{itemCount > 0 ? ` (${itemCount} ${itemCount === 1 ? 'item' : 'items'})` : ''} is kept.
            </p>
          )}
          <StatusMessage type="error">{error}</StatusMessage>

          <form className="auth-form" onSubmit={submit}>
            <label>
              Email address
              <input
                name="email" type="email" autoComplete="username" inputMode="email"
                placeholder="you@example.com" value={form.email} onChange={updateField} required autoFocus
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Your password" value={form.password} onChange={updateField} required
                />
                <button
                  type="button" className="password-toggle" onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            <button className="full" disabled={submitting || !form.email || !form.password}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-note">
            <strong>Classroom demo.</strong> Use only the fictional test accounts your team created. No real payment is taken.
          </p>
          <Link className="auth-back" to={next || '/'}>{next ? '← Back to checkout' : '← Continue browsing products'}</Link>
        </div>
      </div>
    </section>
  );

  return (
    <section className="account-page">
      <div className="account-header">
        <span className="avatar" aria-hidden="true">{initials(customer.name)}</span>
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Hello, {customer.name}</h1>
          <p className="field-hint">Signed in as {customer.email}</p>
        </div>
        <button type="button" className="button secondary" onClick={signOut}>Sign out</button>
      </div>

      <h2>Your simulated orders</h2>
      <StatusMessage type="error">{ordersError}</StatusMessage>
      {ordersLoading && <p className="field-hint">Loading your orders…</p>}
      {!ordersLoading && orders.length === 0 && !ordersError && (
        <div className="empty-state"><p>No orders yet.</p><Link className="button" to="/">Browse products</Link></div>
      )}
      {orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.id} className="order-card">
              <div className="order-card-head">
                <strong>Order #{order.id}</strong>
                <span className="order-status">{order.status}</span>
              </div>
              <p className="field-hint">{new Date(order.createdAt).toLocaleString('en-PH')}</p>
              <ul className="order-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <span>{item.quantity} × {item.productName || `Product ${item.productId}`}</span>
                    <span>{peso(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="order-total"><span>Total</span><strong>{peso(order.total)}</strong></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
