// src/components/QRCodeModal.tsx
// مودال عرض QR Code لربط الأجهزة

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Share2, Copy, Check } from 'lucide-react';
import { useScreenSize } from '../hooks/useScreenSize';

interface QRCodeModalProps {
  sessionId: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ sessionId, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const { isMobile } = useScreenSize();

  // إنشاء رابط اللاعبين
  const playersUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}&screen=players`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, playersUrl, {
        width: isMobile ? 250 : 300,
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
        background: 'linear-gradient(135deg, rgba(10, 1, 24, 0.85) 0%, rgba(26, 11, 46, 0.9) 50%, rgba(45, 17, 84, 0.85) 100%)',
        backdropFilter: 'blur(20px)',
        animation: 'fadeIn 0.3s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '95%' : '500px',
          width: '100%',
          borderRadius: isMobile ? '1rem' : '2rem',
          background: 'linear-gradient(135deg, #1a0b2e 0%, #2d1154 100%)',
          border: '2px solid rgba(168, 85, 247, 0.3)',
          boxShadow: '0 20px 60px rgba(168, 85, 247, 0.4)',
          position: 'relative',
          padding: isMobile ? '1.5rem' : '2.5rem',
        }}
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '1rem' : '1.5rem',
            right: isMobile ? '1rem' : '1.5rem',
            width: isMobile ? '2rem' : '2.5rem',
            height: isMobile ? '2rem' : '2.5rem',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <X size={20} color="white" />
        </button>

        {/* العنوان */}
        <h2
          style={{
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: 900,
            textAlign: 'center',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ربط جهاز اللاعبين 📱
        </h2>

        <p
          style={{
            textAlign: 'center',
            color: '#e9d5ff',
            fontSize: isMobile ? '0.875rem' : '1rem',
            marginBottom: isMobile ? '1.5rem' : '2rem',
          }}
        >
          امسح الباركود أو انسخ الرابط لعرض شاشة اللاعبين على جهاز آخر
        </p>

        {/* QR Code */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: isMobile ? '1.5rem' : '2rem',
          }}
        >
          <div
            style={{
              padding: '1.5rem',
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
            padding: isMobile ? '0.75rem' : '1rem',
            marginBottom: '1rem',
            wordBreak: 'break-all',
          }}
        >
          <p
            style={{
              color: '#a855f7',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              margin: 0,
              textAlign: 'center',
            }}
          >
            {playersUrl}
          </p>
        </div>

        {/* الأزرار */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
          }}
        >
          <button
            onClick={handleCopyLink}
            style={{
              padding: isMobile ? '0.875rem' : '1rem',
              borderRadius: '0.75rem',
              background: copied
                ? 'linear-gradient(135deg, #10b981, #14b8a6)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '0.875rem' : '1rem',
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
                <Check size={18} />
                تم النسخ!
              </>
            ) : (
              <>
                <Copy size={18} />
                نسخ الرابط
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            style={{
              padding: isMobile ? '0.875rem' : '1rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
          >
            <Share2 size={18} />
            مشاركة
          </button>
        </div>

        {/* ملاحظة */}
        <p
          style={{
            textAlign: 'center',
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '1.5rem',
            marginBottom: 0,
          }}
        >
          💡 الجهاز الثاني لا يحتاج تسجيل دخول
        </p>
      </div>
    </div>
  );
};
