import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_SUGGESTIONS = [
  '🔍 Show free events',
  '💻 Technical workshops',
  '📝 How do I register?',
  '🎟️ How do tickets work?',
  '↩️ Refund policy',
];

export default function EventAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Hi there! 👋 I am your **CampusEvents Assistant**. Ask me about upcoming events, free workshops, registration instructions, or ticket policies!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      const data = await response.json();
      const botMsg = {
        sender: 'assistant',
        text: data.reply || 'I could not find information on that topic. Try exploring all events on the Events page!',
        actions: data.suggestedActions || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to connect to the assistant service right now. Please ensure the backend server is active.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Helper to parse markdown links [Label](/path) into router-friendly HTML
  function renderFormattedText(text) {
    // Replace markdown links [Text](URL)
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.substring(lastIdx, match.index));
      }
      parts.push(
        <Link
          key={match.index}
          to={match[2]}
          onClick={() => setIsOpen(false)}
          style={{
            color: 'var(--color-primary, #2563eb)',
            fontWeight: 700,
            textDecoration: 'underline',
          }}
        >
          {match[1]}
        </Link>
      );
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      parts.push(text.substring(lastIdx));
    }

    // Replace bold **text**
    return parts.map((part, pIdx) => {
      if (typeof part !== 'string') return part;
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return <strong key={`${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>;
        }
        return bPart;
      });
    });
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="CampusEvents Assistant"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 18px',
          borderRadius: 30,
          backgroundColor: 'var(--color-primary, #2563eb)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 14,
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: 18 }}>🤖</span>
        <span>{isOpen ? 'Close' : 'Event Assistant'}</span>
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 24,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            height: 520,
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'var(--color-surface, #ffffff)',
            borderRadius: 16,
            border: '1px solid var(--color-border, #e2e8f0)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--color-primary, #2563eb)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🤖</span> CampusEvents Assistant
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                Real-time campus discovery & FAQ guide
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontSize: 18,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Quick suggestions chips */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border, #f1f5f9)',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
            }}
          >
            {DEFAULT_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleSend(sug.replace(/^[^\w\s]+/, '').trim())}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border, #cbd5e1)',
                  backgroundColor: '#ffffff',
                  color: 'var(--color-text, #334155)',
                  cursor: 'pointer',
                }}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Messages list */}
          <div
            style={{
              flex: 1,
              padding: 14,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor:
                      m.sender === 'user'
                        ? 'var(--color-primary, #2563eb)'
                        : 'var(--color-bg-secondary, #f1f5f9)',
                    color: m.sender === 'user' ? '#ffffff' : 'var(--color-text, #1e293b)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {renderFormattedText(m.text)}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {m.actions.map((act) => (
                      <Link
                        key={act.path}
                        to={act.path}
                        onClick={() => setIsOpen(false)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                      >
                        {act.label} &rarr;
                      </Link>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--color-text-muted, #94a3b8)',
                    marginTop: 2,
                    textAlign: m.sender === 'user' ? 'right' : 'left',
                  }}
                >
                  {m.time}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                Thinking & checking campus events...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: 10,
              borderTop: '1px solid var(--color-border, #e2e8f0)',
              display: 'flex',
              gap: 8,
              backgroundColor: 'var(--color-surface, #ffffff)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about events or guidelines..."
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--color-border, #cbd5e1)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary btn-sm"
              style={{ padding: '0 14px' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
