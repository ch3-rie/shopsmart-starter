import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';

const SORT_OPTIONS = [
  { value: 'catalog', label: 'Catalog order' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' }
];

function sortProducts(products, sort) {
  const sorted = [...products];
  sorted.sort((left, right) => {
    if (sort === 'price-asc') return left.price - right.price || left.id - right.id;
    if (sort === 'price-desc') return right.price - left.price || left.id - right.id;
    return left.id - right.id;
  });
  return sorted;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(['All']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart, cartMessage } = useCart();

  useEffect(() => {
    let ignore = false;
    api.getProducts()
      .then((data) => {
        if (ignore) return;
        setCategoryOptions(['All', ...new Set(data.products.map((product) => product.category))]);
      })
      .catch(() => {
        // The product request below reports the failure. Keep All available either way.
      });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    api.getProducts(search.trim())
      .then((data) => {
        if (!ignore) setProducts(data.products);
      })
      .catch((caught) => {
        if (!ignore) {
          setError(caught.message);
          setProducts([]);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [search]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => category === 'All' || product.category === category);
    return sortProducts(filtered, sort);
  }, [products, category, sort]);

  return (
    <section>
      <div className="hero">
        <div>
          <p className="eyebrow">BSIT FULL-STACK PROJECT</p>
          <h1>Technology for study, work and play</h1>
          <p>Browse the starter catalog, build a cart and complete a simulated order.</p>
        </div>
      </div>

      <div className="toolbar">
        <label>
          <span>Search products</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try keyboard" />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <StatusMessage>{cartMessage}</StatusMessage>
      {loading && <StatusMessage>Loading products…</StatusMessage>}
      {error && <StatusMessage type="error">{error} Make sure the backend is running.</StatusMessage>}
      {!loading && !error && visibleProducts.length === 0 && <StatusMessage>No products match your filters.</StatusMessage>}

      {!loading && <div className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </div>}
    </section>
  );
}
