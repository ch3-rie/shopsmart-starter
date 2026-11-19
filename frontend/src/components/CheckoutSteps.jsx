// Progress bar shared by the cart (step 0) and checkout (steps 1 to 3) pages.
const STEPS = ['Cart', 'Delivery details', 'Confirmation'];

export default function CheckoutSteps({ current }) {
  return (
    <ol className="checkout-steps" aria-label="Checkout progress">
      {STEPS.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <li key={label} className={`checkout-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="checkout-step-dot" aria-hidden="true">{state === 'done' ? '✓' : index + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
