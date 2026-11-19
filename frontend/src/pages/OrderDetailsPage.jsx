import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrderConfirmation from '../components/OrderConfirmation.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const { customer, checking } = useAuth();
  const [state, setState] = useState({ status: 'loading', order: null, message: '' });

  useEffect(() => {
    if (!customer) return undefined;
    let active = true;
    setState({ status: 'loading', order: null, message: '' });
    // The API only returns an order that belongs to the signed-in customer.
    api.getOrder(orderId)
      .then((order) => { if (active) setState({ status: 'ready', order, message: '' }); })
      .catch((caught) => {
        if (!active) return;
        const notFound = caught.status === 404 || caught.status === 400;
        setState({ status: notFound ? 'missing' : 'error', order: null, message: caught.message });
      });
    return () => { active = false; };
  }, [customer, orderId]);

  if (checking) return <section className="checkout-page"><p className="auth-checking">Checking your session…</p></section>;

  if (!customer) return (
    <section className="checkout-page">
      <div className="checkout-gate">
        <span className="checkout-gate-icon" aria-hidden="true">🔒</span>
        <h1>Sign in to view this order</h1>
        <p className="field-hint">Orders are private. Only the customer who placed an order can see it.</p>
        <Link className="button" to={`/account?next=/account/orders/${encodeURIComponent(orderId)}`}>Sign in</Link>
      </div>
    </section>
  );

  if (state.status === 'loading') return <section className="checkout-page"><p className="auth-checking">Loading order…</p></section>;

  if (state.status !== 'ready') return (
    <section className="checkout-page">
      <div className="checkout-gate">
        <span className="checkout-gate-icon" aria-hidden="true">🔎</span>
        <h1>{state.status === 'missing' ? 'Order not found' : 'Order could not be loaded'}</h1>
        <p className="field-hint">
          {state.status === 'missing'
            ? 'This order does not exist or belongs to another account.'
            : state.message || 'Please try again in a moment.'}
        </p>
        <Link className="button" to="/account">← Back to my orders</Link>
      </div>
    </section>
  );

  return (
    <section className="checkout-page">
      <Link className="auth-back" to="/account">← My orders</Link>
      <OrderConfirmation order={state.order} variant="details" />
    </section>
  );
}
