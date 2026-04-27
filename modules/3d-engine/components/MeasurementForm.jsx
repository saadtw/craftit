'use client';

import React, { useState } from 'react';
import * as THREE from 'three';
import { useAnnotations } from './AnnotationStore';
import { SCALE_FACTORS } from './types';

const SCALE_OPTIONS = [
  { value: 'units', label: 'Units' },
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
];

export default function MeasurementForm({ pointA, pointB, onClose }) {
  const { state, dispatch } = useAnnotations();
  const [manualLength, setManualLength] = useState('');
  const [manualUnit, setManualUnit] = useState(state.scaleUnit);

  // Calculate 3D distance
  const vA = new THREE.Vector3(...pointA);
  const vB = new THREE.Vector3(...pointB);
  const dist3D = vA.distanceTo(vB);
  const factor = SCALE_FACTORS[state.scaleUnit];
  const display3D = (dist3D * factor).toFixed(3);
  const unit = state.scaleUnit === 'units' ? '' : state.scaleUnit;

  const handleSave = () => {
    const mUnit = manualUnit === 'units' ? '' : manualUnit;
    const baseLabel = `${manualLength || display3D} ${mUnit}`.trim();
    const mIndex = state.measurements.length + 1;
    const finalLabel = `M${mIndex}: ${baseLabel}`;
    
    const measurement = {
      id: crypto.randomUUID(),
      pointA,
      pointB,
      distanceRaw: dist3D,
      label: finalLabel,
    };
    dispatch({ type: 'ADD_MEASUREMENT', payload: measurement });
    onClose();
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '2px',
    color: 'white',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    /* Full-screen backdrop — click outside = cancel */
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Modal card */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '340px',
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '4px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#737373' }}>straighten</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
              New Measurement
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#737373', cursor: 'pointer',
              fontSize: '20px', lineHeight: 1, padding: '2px 6px',
              borderRadius: '2px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = '#737373')}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px' }}>
          {/* Auto-calculated read-out */}
          <div style={{
            padding: '10px 12px', marginBottom: '14px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '2px',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '4px' }}>
              Calculated Distance
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
              {display3D} <span style={{ fontSize: '11px', color: '#737373' }}>{unit || 'units'}</span>
            </span>
          </div>

          {/* Manual override label */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '8px' }}>
            Override Label (optional)
          </span>

          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="number"
              placeholder={`e.g. ${display3D}`}
              value={manualLength}
              onChange={(e) => setManualLength(e.target.value)}
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter') handleSave(); }}
            />
            <select
              value={manualUnit}
              onChange={(e) => setManualUnit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...inputStyle,
                width: '80px', flexShrink: 0, cursor: 'pointer',
              }}
            >
              {SCALE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} style={{ background: '#1a1a1a' }}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '2px', color: '#737373', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 2, padding: '10px',
                background: 'white', border: 'none',
                borderRadius: '2px', color: '#0a0a0a', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e5e5e5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
              Save Dimension
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
