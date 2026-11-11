import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const { addToCart, cartMessage } = useCart();

  useEffect(() => {
    let active = true;
    setError('');
    setProduct(null);
    api.getProduct(productId)
      .then((nextProduct) => { if (active) setProduct(nextProduct); })
      .catch((caught) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [productId]);

  if (error) return <section><StatusMessage type="error">{error}</StatusMessage><Link to="/">Return to products</Link></section>;
  if (!product) return <section><StatusMessage>Loading product…</StatusMessage></section>;

  return (
    <section className="details-layout">
      <div className="details-icon" aria-hidden="true">{product.emoji}</div>
      <div>
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
        <p>{product.stock} unit(s) available</p>
        <StatusMessage>{cartMessage}</StatusMessage>
        <button disabled={product.stock < 1} onClick={() => addToCart(product)}>Add to cart</button>
      </div>
    </section>
  );
}
