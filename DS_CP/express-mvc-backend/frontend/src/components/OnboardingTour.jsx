import { useState } from 'react';

const STEPS = [
  {
    icon: '🛰️',
    title: 'Welcome to Fleet Command Center',
    desc: 'This dashboard tracks 1,000 vehicles across 12 major Indian cities in real time. Everything updates automatically — no need to refresh.',
    highlight: null,
  },
  {
    icon: '🗺️',
    title: 'The Map — Your Main View',
    desc: 'Each colored dot is a vehicle. Green = slow, Yellow = medium, Orange = fast, Red = very fast. Click any dot to see its full details.',
    highlight: 'map',
  },
  {
    icon: '🎯',
    title: 'Find the Nearest Vehicle',
    desc: 'Click "Find Nearest Vehicle" in the toolbar, then click anywhere on the map. The system instantly finds and highlights the closest vehicle using an R-Tree spatial index.',
    highlight: 'toolbar',
  },
  {
    icon: '🗺️',
    title: 'Plan a Route',
    desc: 'Click "Plan a Route", then click two points on the map. The system runs Dijkstra\'s algorithm with a min-heap to find the shortest path between them.',
    highlight: 'toolbar',
  },
  {
    icon: '🔶',
    title: 'Draw an Alert Zone',
    desc: 'Click "Draw Alert Zone", then click several points on the map to draw a polygon. Any vehicle entering or leaving that zone triggers an instant alert.',
    highlight: 'toolbar',
  },
  {
    icon: '🚛',
    title: 'Launch Your Own Truck',
    desc: 'Use the "My Trucks" panel to launch a virtual truck. Set its starting location, speed, and direction — it will move in real time on the map.',
    highlight: 'sidebar',
  },
  {
    icon: '📍',
    title: 'Filter by City',
    desc: 'Click any city in the "City Fleet Stats" panel to filter the map to show only vehicles in that city. Click again to clear the filter.',
    highlight: 'sidebar',
  },
  {
    icon: '🔍',
    title: 'Smart Search',
    desc: 'Press Ctrl+K (or click the 🔍 button in the header) to open the smart search. Type any vehicle ID or city name to instantly find it.',
    highlight: 'header',
  },
  {
    icon: '✅',
    title: "You're Ready!",
    desc: "That's everything. The dashboard is fully live and updates every second. Explore freely — you can always hover over any panel for tips.",
    highlight: null,
  },
];

export default function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', width: '100%', maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--border)' }}>
          <div style={{
            height: '100%', background: 'var(--accent)',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Icon + step count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '2.5rem' }}>{current.icon}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {/* Title */}
          <h2 style={{ margin: '0 0 10px', fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.02em' }}>
            {current.title}
          </h2>

          {/* Description */}
          <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            {current.desc}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '20px' }}>
            {STEPS.map((_, i) => (
              <div key={i} onClick={() => setStep(i)} style={{
                width: i === step ? '20px' : '7px', height: '7px',
                borderRadius: '999px', cursor: 'pointer',
                background: i === step ? 'var(--accent)' : i < step ? 'var(--border-strong)' : 'var(--border)',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              }}>← Back</button>
            )}
            <button onClick={isLast ? onClose : () => setStep(s => s + 1)} style={{
              flex: 2, padding: '10px', borderRadius: '10px',
              background: isLast ? '#10b981' : 'var(--accent)',
              border: 'none', color: '#fff',
              cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
            }}>
              {isLast ? '🚀 Start Exploring!' : 'Next →'}
            </button>
          </div>

          <button onClick={onClose} style={{
            width: '100%', marginTop: '10px', padding: '6px',
            background: 'none', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', fontSize: '0.78rem',
          }}>Skip tour</button>
        </div>
      </div>
    </div>
  );
}