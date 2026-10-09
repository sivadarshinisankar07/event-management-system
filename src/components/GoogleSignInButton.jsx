import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';
import { getOAuthConfig } from '../services/authService.js';
import Modal from './Modal.jsx';

export default function GoogleSignInButton({ onSuccess }) {
  const { googleLogin } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [config, setConfig] = useState({ configured: false, clientId: null });
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const googleBtnContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const conf = await getOAuthConfig();
        if (isMounted) {
          setConfig(conf);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    loadConfig();
    return () => { isMounted = false; };
  }, []);

  // When configured and client ID is available, initialize Google Identity Services
  useEffect(() => {
    if (!config.configured || !config.clientId) return;

    function initGsi() {
      if (window.google?.accounts?.id && googleBtnContainerRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: handleGoogleResponse,
          });

          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
          });
        } catch (err) {
          console.warn('Failed to render official Google button:', err);
        }
      }
    }

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    }
  }, [config]);

  async function handleGoogleResponse(response) {
    if (!response || !response.credential) {
      showToast('Google Sign-In was cancelled or failed.', 'error');
      return;
    }

    setAuthenticating(true);
    const result = await googleLogin(response.credential);
    setAuthenticating(false);

    if (result.success) {
      showToast('Successfully signed in with Google!', 'success');
      if (onSuccess) onSuccess(result.user);
    } else {
      showToast(result.message || 'Google sign-in failed.', 'error');
    }
  }

  function handleUnconfiguredClick() {
    setShowConfigModal(true);
  }

  return (
    <div className="google-auth-wrapper" style={{ marginTop: 12, marginBottom: 12 }}>
      {config.configured && config.clientId ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div ref={googleBtnContainerRef} />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUnconfiguredClick}
          className="btn btn-secondary btn-block"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 16px',
            fontWeight: 600,
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {t('auth.signInWithGoogle', 'Sign in with Google')}
        </button>
      )}

      {showConfigModal && (
        <Modal
          title="Google OAuth 2.0 Configuration Required"
          onClose={() => setShowConfigModal(false)}
        >
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text)' }}>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Google OAuth sign-in integration is fully implemented</strong> in both the frontend and backend.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              To enable live authentication with your Google Cloud project, complete the single remaining configuration step:
            </p>
            <div
              style={{
                backgroundColor: 'var(--color-bg-secondary, #f1f5f9)',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontFamily: 'monospace',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              1. Open <code>backend/.env</code><br />
              2. Set <code>GOOGLE_CLIENT_ID=&lt;your-google-client-id&gt;</code><br />
              3. Restart backend server (<code>npm start</code>)
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
              Note: The Google Client Secret remains strictly protected on the backend according to academic security standards.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowConfigModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
