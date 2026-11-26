import { useState, useEffect, useRef } from 'react';

/**
 * Gujarat Vidyapith Startup Splash Screen
 * 
 * Features:
 * - Full-screen centered splash with Vidyapith emblem & Welcome animation
 * - Respects prefers-reduced-motion
 * - Click anywhere to skip
 * - Duration: ~2.5 seconds with smooth fade-out
 * - Triggered once per browser session via sessionStorage
 * - Styled using Vidyapith Khadi brown (#563828), Sage green (#7D8A58), Cyan (#17A2B8), and Cream (#FAF6F5)
 */
export default function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem('ps_splash_shown') !== 'true';
    } catch {
      return false;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isVisible) {
      if (onComplete && !completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const totalDuration = prefersReducedMotion ? 1000 : 2500;
    const intervalTime = 50;
    const step = 100 / (totalDuration / intervalTime);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    const exitTimer = setTimeout(() => {
      handleFinish();
    }, totalDuration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(exitTimer);
    };
  }, [isVisible]);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;

    try {
      sessionStorage.setItem('ps_splash_shown', 'true');
    } catch {}

    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, 400);
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleFinish}
      role="banner"
      aria-label="Gujarat Vidyapith Welcome Splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF6F5',
        backgroundImage: 'radial-gradient(circle at center, #FFFFFF 0%, #FAF6F5 65%, #EFE8DD 100%)',
        cursor: 'pointer',
        userSelect: 'none',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
        padding: '20px',
      }}
    >
      <style>{`
        @keyframes gvSplashScaleIn {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          50% {
            opacity: 1;
            transform: scale(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes gvPulseGlow {
          0%, 100% {
            box-shadow: 0 4px 24px rgba(86, 56, 40, 0.12);
          }
          50% {
            box-shadow: 0 8px 36px rgba(86, 56, 40, 0.22);
          }
        }
        .gv-splash-card {
          animation: gvSplashScaleIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .gv-splash-card {
            animation: none !important;
          }
        }
      `}</style>

      {/* Decorative Watermark Backdrop */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '420px',
          height: '420px',
          backgroundImage: 'url(/images/gujarat-vidyapith-logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          opacity: 0.04,
          pointerEvents: 'none',
        }}
      />

      {/* Central Welcome Card */}
      <div
        className="gv-splash-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '520px',
          padding: '40px 36px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1.5px solid #E5DCD3',
          boxShadow: '0 12px 40px rgba(86, 56, 40, 0.12)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Vidyapith Seal */}
        <div
          style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            backgroundColor: '#FAF6F5',
            border: '2px solid #E5DCD3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            padding: '8px',
            animation: 'gvPulseGlow 2s infinite ease-in-out',
          }}
        >
          <img
            src="/images/gujarat-vidyapith-logo.png"
            alt="Gujarat Vidyapith Crest"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Institutional Title */}
        <h1
          style={{
            margin: '0 0 4px',
            fontSize: '1.55rem',
            fontWeight: 800,
            color: '#563828',
            letterSpacing: '0.06em',
            fontFamily: '"Open Sans", serif',
          }}
        >
          GUJARAT VIDYAPITH
        </h1>

        {/* Gujarati Motto */}
        <div
          style={{
            fontSize: '0.92rem',
            color: '#7D8A58',
            fontWeight: 600,
            fontStyle: 'italic',
            marginBottom: '14px',
          }}
        >
          "સા વિદ્યા યા વિમુક્તયે"
        </div>

        {/* Thin Khadi Divider */}
        <div
          style={{
            width: '70px',
            height: '2px',
            backgroundColor: '#CFC2B4',
            marginBottom: '16px',
          }}
        />

        {/* Placement Setu Tagline */}
        <div
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#17A2B8',
            letterSpacing: '0.12em',
            marginBottom: '6px',
          }}
        >
          PLACEMENT SETU
        </div>

        <p
          style={{
            margin: '0 0 24px',
            fontSize: '0.86rem',
            color: '#7D6E60',
            lineHeight: 1.5,
          }}
        >
          Official Campus Recruitment &amp; Career Placement Gateway
        </p>

        {/* Smooth Progress Bar */}
        <div
          style={{
            width: '220px',
            height: '5px',
            backgroundColor: '#EFE8DD',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#563828',
              backgroundImage: 'linear-gradient(90deg, #563828 0%, #17A2B8 100%)',
              transition: 'width 0.05s linear',
            }}
          />
        </div>

        {/* Skip Notice Pill */}
        <span
          style={{
            fontSize: '0.74rem',
            color: '#8A7F78',
            backgroundColor: '#FAF6F5',
            padding: '4px 12px',
            borderRadius: '12px',
            border: '1px solid #E5DCD3',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Click anywhere to skip ➔
        </span>
      </div>
    </div>
  );
}
