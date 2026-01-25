// src/components/ErrorBoundary.tsx
// معالج الأخطاء لمنع الشاشة الفارغة

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 50%, #4c1d95 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>حدث خطأ!</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem', color: '#ef4444' }}>
            {this.state.error?.message || 'خطأ غير معروف'}
          </p>

          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
              border: 'none',
              borderRadius: '1rem',
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '2rem',
            }}
          >
            إعادة تحميل الصفحة
          </button>

          {this.state.errorInfo && (
            <details style={{
              maxWidth: '800px',
              width: '100%',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '1rem',
              padding: '1rem',
              textAlign: 'left',
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                تفاصيل الخطأ (للمطورين)
              </summary>
              <pre style={{
                overflow: 'auto',
                fontSize: '0.75rem',
                color: '#ef4444',
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.error?.stack}
              </pre>
              <pre style={{
                overflow: 'auto',
                fontSize: '0.75rem',
                color: '#fbbf24',
                whiteSpace: 'pre-wrap',
                marginTop: '1rem',
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
