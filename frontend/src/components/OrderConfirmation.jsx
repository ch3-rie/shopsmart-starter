import { useState } from 'react';
import { Link } from 'react-router-dom';

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

const NEXT_STEPS = [
  { title: 'Order received', detail: 'Saved to your account' },
  { title: 'Packing', detail: 'Simulated in this demo' },
  { title: 'Out for delivery', detail: 'Simulated in this demo' },
  { title: 'Delivered', detail: 'Simulated in this demo' }
];

// variant "confirmation": shown right after checkout.
// variant "details": shown when the customer opens a past order from Account.
export default function OrderConfirmation({ order, variant = 'confirmation' }) {
  const isDetails = variant === 'details';
  const [copied, setCopied] = useState(false);
  const items = order.items ?? [];
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const placedAt = order.createdAt ? new Date(order.createdAt) : null;
  const placedText = placedAt ? placedAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(`#${order.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="confirmation">
      <header className="confirmation-hero">
        <span className="order-success-icon" aria-hidden="true">{isDetails ? '🧾' : '✓'}</span>
        <p className="eyebrow">{isDetails ? 'Simulated order' : 'Order confirmed'}</p>
        <h1>{isDetails ? `Order #${order.id}` : `Thank you, ${firstName(order.customerName)}!`}</h1>
        <p>{isDetails ? `Placed ${placedText}. No payment was taken.` : 'Your simulated order is saved to your account. No payment was taken.'}</p>
        <div className="order-number">
          <span>Order number</span>
          <strong>#{order.id}</strong>
          <button type="button" className="copy-button" onClick={copyOrderNumber} aria-live="polite">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </header>

      <div className="confirmation-grid">
        <section className="confirmation-card" aria-labelledby="confirmation-items">
          <h2 id="confirmation-items">Items ordered</h2>
          <ul className="summary-items">
            {items.map((item) => (
              <li key={item.id}>
                <span className="summary-qty">{item.quantity}×</span>
                <span className="summary-name">
                  <Link to={`/products/${item.productId}`}>{item.productName || `Product ${item.productId}`}</Link>
                  <small>{peso(item.unitPrice)} each</small>
                </span>
                <span>{peso(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-lines">
            <p><span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><span>{peso(order.total)}</span></p>
            <p><span>Delivery</span><span className="free">Free</span></p>
            <p><span>Payment</span><span>Simulated, ₱0.00 charged</span></p>
            <p className="summary-grand"><span>Total</span><strong>{peso(order.total)}</strong></p>
          </div>
        </section>

        <div className="confirmation-side">
          <section className="confirmation-card" aria-labelledby="confirmation-delivery">
            <h2 id="confirmation-delivery">Delivery to</h2>
            <p className="delivery-name">{order.customerName}</p>
            <p className="field-hint">{order.email}</p>
            <p className="delivery-address">{order.address}</p>
          </section>

          <section className="confirmation-card" aria-labelledby="confirmation-info">
            <h2 id="confirmation-info">Order info</h2>
            <dl className="order-info">
              <div><dt>Placed</dt><dd>{placedText}</dd></div>
              <div><dt>Status</dt><dd><span className="order-status">{order.status}</span></dd></div>
            </dl>
          </section>
        </div>
      </div>

      <section className="confirmation-card" aria-labelledby="confirmation-next">
        <h2 id="confirmation-next">What happens next</h2>
        <ol className="order-timeline">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.title} className={index === 0 ? 'done' : 'upcoming'}>
              <span className="timeline-dot" aria-hidden="true">{index === 0 ? '✓' : index + 1}</span>
              <span><strong>{step.title}</strong><small>{step.detail}</small></span>
            </li>
          ))}
        </ol>
        <p className="field-hint timeline-note">Classroom demo: the status stays PENDING. No real delivery takes place.</p>
      </section>

      <div className="order-success-actions confirmation-actions">
        {isDetails ? (
          <Link className="button" to="/account">← Back to my orders</Link>
        ) : (
          <>
            <Link className="button" to="/account">View my orders</Link>
            <Link className="button secondary" to="/">Continue shopping</Link>
          </>
        )}
        <button type="button" className="button secondary" onClick={() => window.print()}>Print receipt</button>
      </div>
    </div>
  );
}
