import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 300;
const SUGGESTIONS = [
  'Which keyboard is below ₱2,000?',
  'What is the cheapest item for studying?',
  'Do you have a webcam for online classes?',
  'Recommend a headset under ₱1,500'
];

function readableError(caught) {
  if (caught?.status === 422 && caught.message) return caught.message;
  if (caught?.status === 429) return 'You are asking very quickly. Wait a minute, then try again.';
  if (!caught?.status) return 'ShopSmart is unavailable right now. Please try again.';
  return caught.message || 'ShopSmart could not answer that question right now.';
}

function peso(value) {
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const pending = useRef(false);
  const messageTimer = useRef(null);

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  async function ask(text) {
    if (pending.current) return;

    const trimmed = text.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH || trimmed.length > MAX_QUESTION_LENGTH) {
      setResult(null);
      setAsked('');
      setError('Question must contain between 3 and 300 characters.');
      return;
    }

    pending.current = true;
    setError('');
    setResult(null);
    setAsked(trimmed);
    setLoading(true);
    setLoadingMessage('Searching the catalog…');
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setLoadingMessage('Checking prices and stock…'), 700);

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

  function submit(event) {
    event.preventDefault();
    ask(question);
  }

  // Enter sends; Shift+Enter adds a new line.
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask(question);
    }
  }

  function pickSuggestion(text) {
    setQuestion(text);
    ask(text);
  }

  const length = question.trim().length;
  const nearLimit = length > MAX_QUESTION_LENGTH - 30;
  const recommendations = result?.recommendedProducts ?? [];
  const sources = result?.sources ?? [];

  return (
    <section className="assistant-page">
      <header className="assistant-hero">
        <p className="eyebrow">Product assistant</p>
        <h1>Ask ShopSmart</h1>
        <p>Ask about products, budgets or availability. Every answer is checked against the current catalog, so prices and stock are always up to date.</p>
      </header>

      <div className="assistant-layout">
        <div className="assistant-ask">
          <form className="assistant-form" onSubmit={submit}>
            <label htmlFor="assistant-question">Your question</label>
            <textarea
              id="assistant-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="e.g. Which keyboard is below ₱2,000?"
              disabled={loading}
              rows={4}
            />
            <div className="assistant-form-footer">
              <span className={`char-count${nearLimit ? ' near-limit' : ''}`}>{length}/{MAX_QUESTION_LENGTH}</span>
              <span className="field-hint">Enter to send · Shift+Enter for a new line</span>
              <button disabled={loading || length === 0}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
            </div>
          </form>

          <div className="assistant-suggestions">
            <p className="field-hint">Try one of these</p>
            <div className="chip-row">
              {SUGGESTIONS.map((text) => (
                <button key={text} type="button" className="chip" onClick={() => pickSuggestion(text)} disabled={loading}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="assistant-answer" aria-live="polite" aria-busy={loading}>
          {!loading && !result && !error && (
            <div className="assistant-empty">
              <span className="assistant-empty-icon" aria-hidden="true">💬</span>
              <h2>Your answer will appear here</h2>
              <p className="field-hint">Ask a question or pick a suggestion to get product recommendations from the live catalog.</p>
            </div>
          )}

          {asked && (loading || result) && (
            <p className="assistant-question-echo"><span>You asked</span>{asked}</p>
          )}

          <StatusMessage type="error">{error}</StatusMessage>

          {loading && (
            <div className="assistant-loading" role="status">
              <p><span className="dot-pulse" aria-hidden="true"><span /><span /><span /></span>{loadingMessage}</p>
              <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>
            </div>
          )}

          {!loading && result && (
            <>
              <p className="assistant-reply">{result.answer}</p>

              {result.answerSource && (
                <p className={`source-badge ${result.answerSource}`} data-testid="answer-source">
                  {result.answerSource === 'ai_provider'
                    ? 'Source: AI provider draft, checked against the current catalog by the server.'
                    : 'Source: ShopSmart catalog rules (no live AI answer was used).'}
                </p>
              )}

              {recommendations.length > 0 ? (
                <div className="recommendation-list">
                  <h3>Recommended for you</h3>
                  {recommendations.map((product) => (
                    <Link key={product.id} className="recommendation-card" to={product.link || `/products/${product.id}`}>
                      <span className="recommendation-text">
                        {product.category && <span className="recommendation-category">{product.category}</span>}
                        <strong>{product.name}</strong>
                      </span>
                      <span className="recommendation-price">{peso(product.price)}</span>
                      <span className="recommendation-go" aria-hidden="true">View →</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="field-hint">No matching products are currently available. Try a different product or a higher budget.</p>
              )}

              {sources.length > 0 && (
                <details className="assistant-sources">
                  <summary>Catalog sources ({sources.length})</summary>
                  <ul>
                    {sources.map((source) => (
                      <li key={source.id}>
                        <Link to={`/products/${source.id}`}>{source.name}</Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
