// src/components/QRCodeModal.tsx
// مودال عرض QR Code لربط الأجهزة + فتح شاشة اللاعبين

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Share2, Copy, Check, Tv, ExternalLink } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface QRCodeModalProps {
  sessionId: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ sessionId, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const { isMobile } = useScreenSize();

  // رابط اللاعبين - يتضمن session ID للانضمام التلقائي بدون إدخال رمز
  const playersUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}&screen=join`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, playersUrl, {
        width: isMobile ? 220 : 260,
        margin: 2,
        color: {
          dark: '#1a0b2e',
          light: '#ffffff',
        },
      });
    }
  }, [playersUrl, isMobile]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(playersUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'انضم إلى لعبة حرب الحروف',
          text: 'امسح الباركود أو افتح الرابط للانضمام كلاعب',
          url: playersUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenLocally = () => {
    window.open(playersUrl, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '95%' : '480px',
          width: '100%',
          borderRadius: isMobile ? '1.25rem' : '1.75rem',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          boxShadow: '0 20px 60px rgba(168, 85, 247, 0.4)',
          position: 'relative',
          padding: isMobile ? '1.5rem' : '2rem',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '0.75rem' : '1rem',
            right: isMobile ? '0.75rem' : '1rem',
            width: '2rem',
            height: '2rem',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} color="white" />
        </button>

        {/* العنوان */}
        <h2
          style={{
            fontSize: isMobile ? '1.3rem' : '1.6rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          شاشة اللاعبين
        </h2>

        <p
          style={{
            textAlign: 'center',
            color: '#c4b5fd',
            fontSize: isMobile ? '0.85rem' : '0.95rem',
            marginBottom: isMobile ? '1rem' : '1.25rem',
          }}
        >
          امسح الكود أو افتح الرابط — الانضمام فوري بدون أي خطوات إضافية
        </p>

        {/* زر فتح من نفس الجهاز */}
        <button
          onClick={handleOpenLocally}
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '1.15rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #10b981, #14b8a6)',
            border: 'none',
            color: 'white',
            fontSize: isMobile ? '1.05rem' : '1.15rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            marginBottom: isMobile ? '1.25rem' : '1.5rem',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Tv size={22} />
          فتح شاشة اللاعبين (هذا الجهاز)
          <ExternalLink size={16} style={{ opacity: 0.7 }} />
        </button>

        {/* فاصل */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: isMobile ? '1.25rem' : '1.5rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(168, 85, 247, 0.25)' }} />
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem', fontWeight: 600 }}>أو على جهاز آخر</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(168, 85, 247, 0.25)' }} />
        </div>

        {/* بطاقة الرمز النصي */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(99, 102, 241, 0.15))',
          border: '2px solid rgba(168, 85, 247, 0.5)',
          borderRadius: '1rem',
          padding: isMobile ? '0.9rem 1rem' : '1rem 1.25rem',
          marginBottom: isMobile ? '1rem' : '1.25rem',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            أو شاركوا الرمز يدوياً
          </p>
          <span style={{
            fontSize: isMobile ? '1.8rem' : '2.1rem',
            fontWeight: 900,
            color: '#e9d5ff',
            letterSpacing: '0.22em',
            fontFamily: 'monospace',
            textShadow: '0 2px 12px rgba(168,85,247,0.5)',
          }}>
            {sessionId}
          </span>
        </div>

        {/* QR Code */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? '1rem' : '1.25rem',
          }}
        >
          <div
            style={{
              padding: '1.25rem',
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* الرابط */}
        <div
          style={{
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '0.75rem',
            padding: isMobile ? '0.6rem 0.75rem' : '0.75rem 1rem',
            marginBottom: '1rem',
            wordBreak: 'break-all',
          }}
        >
          <p
            style={{
              color: '#a855f7',
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              margin: 0,
              textAlign: 'center',
              direction: 'ltr',
            }}
          >
            {playersUrl}
          </p>
        </div>

        {/* أزرار النسخ والمشاركة */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={handleCopyLink}
            style={{
              padding: isMobile ? '0.75rem' : '0.85rem',
              borderRadius: '0.75rem',
              background: copied
                ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                : 'rgba(99, 102, 241, 0.2)',
              border: copied ? 'none' : '1.5px solid rgba(99, 102, 241, 0.4)',
              color: 'white',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                تم النسخ!
              </>
            ) : (
              <>
                <Copy size={16} />
                نسخ الرابط
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            style={{
              padding: isMobile ? '0.75rem' : '0.85rem',
              borderRadius: '0.75rem',
              background: 'rgba(168, 85, 247, 0.2)',
              border: '1.5px solid rgba(168, 85, 247, 0.4)',
              color: 'white',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            <Share2 size={16} />
            مشاركة
          </button>
        </div>

        {/* ملاحظة */}
        <p
          style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '1rem',
            marginBottom: 0,
          }}
        >
          الجهاز الثاني لا يحتاج تسجيل دخول
        </p>
      </div>
    </div>
  );
};
