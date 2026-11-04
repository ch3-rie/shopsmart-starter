import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 300;

function readableError(caught) {
  if (caught?.status === 422 && caught.message) return caught.message;
  if (!caught?.status) return 'ShopSmart is unavailable right now. Please try again.';
  return caught.message || 'ShopSmart could not answer that question right now.';
}

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const pending = useRef(false);
  const messageTimer = useRef(null);

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  async function ask(event) {
    event.preventDefault();
    if (pending.current) return;

    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH || trimmed.length > MAX_QUESTION_LENGTH) {
      setResult(null);
      setError('Question must contain between 3 and 300 characters.');
      return;
    }

    pending.current = true;
    setError('');
    setResult(null);
    setLoading(true);
    setLoadingMessage('Searching the catalog...');
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setLoadingMessage('Preparing your recommendations...'), 700);

    try {
      setResult(await api.askAssistant(trimmed));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      clearTimeout(messageTimer.current);
      pending.current = false;
      setLoading(false);
      setLoadingMessage('');
    }
  }

  const length = question.trim().length;
  const recommendations = result?.recommendedProducts ?? [];
  const sources = result?.sources ?? [];

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">PRODUCT ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Ask about products, budgets, or availability. ShopSmart checks the current catalog before recommending anything.</p>
        <form onSubmit={ask}>
          <label>
            Your question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="Which keyboard is below ₱2,000?"
              disabled={loading}
            />
          </label>
          <p className="field-hint">{length}/{MAX_QUESTION_LENGTH} characters. Use 3 to 300 characters.</p>
          <button disabled={loading}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer" aria-live="polite">
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>
        {loading && <p className="assistant-loading">{loadingMessage}</p>}
        {!loading && !result && !error && <p>Your answer will appear here.</p>}
        {!loading && result && (
          <>
            <p>{result.answer}</p>
            {recommendations.length > 0 ? (
              <div className="recommendations">
                {recommendations.map((product) => (
                  <Link key={product.id} to={product.link || `/products/${product.id}`}>
                    {product.name} — ₱{Number(product.price).toLocaleString('en-PH')}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="field-hint">No matching products are currently available.</p>
            )}
            {sources.length > 0 && (
              <div className="assistant-sources">
                <h3>Catalog sources</h3>
                <ul>
                  {sources.map((source) => (
                    <li key={source.id}>
                      <Link to={`/products/${source.id}`}>{source.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
