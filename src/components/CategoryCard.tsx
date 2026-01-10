// src/components/CategoryCard.tsx
// كارد الكاتيجوري - نمط carson.grind

import React, { useState } from 'react';
import type { Category } from '../core/types';
import { X, Star } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
    setIsFlipped(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setIsFlipped(false), 300);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <>
      {/* البطاقة الصغيرة */}
      <div
        onClick={handleCardClick}
        style={{
          width: '100%',
          borderRadius: '1.5rem',
          background: category.color,
          padding: '1.5rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: '3px solid rgba(0, 0, 0, 0.2)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.3)';
        }}
      >
        {/* الأيقونة والعنوان */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '2rem' }}>{category.icon}</span>
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 900,
            color: 'white',
            margin: 0,
          }}>
            {category.name}
          </h3>
        </div>

        {/* الوصف القصير */}
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '0.875rem',
          marginBottom: '1rem',
          lineHeight: '1.4',
        }}>
          {category.description.substring(0, 60)}...
        </p>

        {/* Tags */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}>
          <span style={{
            background: 'rgba(255, 255, 255, 0.25)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'white',
          }}>
            {category.questionsCount} سؤال
          </span>
          <span style={{
            background: 'rgba(255, 255, 255, 0.25)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}>
            <Star size={12} fill="currentColor" />
            {category.rating}
          </span>
        </div>

        {/* زر Play Now */}
        <button style={{
          width: '100%',
          background: '#fbbf24',
          border: 'none',
          borderRadius: '0.75rem',
          padding: '0.75rem',
          fontSize: '1rem',
          fontWeight: 900,
          color: '#000',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 0 #d97706',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(2px)';
          e.currentTarget.style.boxShadow = '0 2px 0 #d97706';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 0 #d97706';
        }}
        >
          اعرف المزيد
        </button>

        {/* تأثير اللمعان */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* المودال - البطاقة الكبيرة */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={handleClose}
        >
          {/* البطاقة المركزية */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleFlip();
            }}
            style={{
              maxWidth: '500px',
              width: '100%',
              aspectRatio: '3 / 4',
              perspective: '1000px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.6s ease',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
              }}
            >
              {/* الواجهة الأمامية */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  borderRadius: '2rem',
                  background: category.color,
                  padding: '3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '4px solid rgba(0, 0, 0, 0.2)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* العنوان والأيقونة */}
                <div>
                  <div style={{ fontSize: '5rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {category.icon}
                  </div>
                  <h2 style={{
                    fontSize: '3rem',
                    fontWeight: 900,
                    color: 'white',
                    textAlign: 'center',
                    margin: 0,
                  }}>
                    {category.name}
                  </h2>
                </div>

                {/* التقييم */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={32}
                      fill={star <= category.rating ? '#fbbf24' : 'none'}
                      color={star <= category.rating ? '#fbbf24' : 'white'}
                    />
                  ))}
                </div>

                {/* نص التلميح */}
                <p style={{
                  textAlign: 'center',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: 0,
                }}>
                  اضغط للقلب 🔄
                </p>

                {/* تأثير اللمعان */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
                  pointerEvents: 'none',
                  borderRadius: '2rem 2rem 0 0',
                }} />
              </div>

              {/* الواجهة الخلفية */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  borderRadius: '2rem',
                  background: category.color,
                  padding: '3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '4px solid rgba(0, 0, 0, 0.2)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                  overflow: 'auto',
                }}
              >
                {/* المحتوى */}
                <div>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '2rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                  }}>
                    <span style={{ fontSize: '3rem' }}>{category.icon}</span>
                    <h3 style={{
                      fontSize: '2rem',
                      fontWeight: 900,
                      color: 'white',
                      margin: 0,
                    }}>
                      {category.name}
                    </h3>
                  </div>

                  <p style={{
                    color: 'white',
                    fontSize: '1.125rem',
                    lineHeight: '1.8',
                    marginBottom: '2rem',
                  }}>
                    {category.description}
                  </p>

                  {/* المعلومات */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                    }}>
                      <span style={{ color: 'white', fontWeight: 700 }}>عدد الأسئلة:</span>
                      <span style={{ 
                        color: 'white', 
                        fontSize: '1.5rem',
                        fontWeight: 900,
                      }}>
                        {category.questionsCount}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ color: 'white', fontWeight: 700 }}>التقييم:</span>
                      <span style={{ 
                        color: 'white', 
                        fontSize: '1.5rem',
                        fontWeight: 900,
                      }}>
                        {category.rating} ⭐
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{
                  textAlign: 'center',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: 0,
                }}>
                  اضغط للقلب مرة أخرى 🔄
                </p>
              </div>
            </div>
          </div>

          {/* زر الإغلاق */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <X size={24} color="white" />
          </button>
        </div>
      )}

      {/* CSS للأنيميشنز */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};