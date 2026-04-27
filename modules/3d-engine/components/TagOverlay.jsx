'use client';

import React from 'react';
import { useAnnotations } from './AnnotationStore';

export default function TagOverlay({ positions }) {
  const { state, dispatch } = useAnnotations();

  return (
    <div className="tag-overlay-container" aria-label="Tag overlays">
      {state.tags.map((tag) => {
        const pos = positions.get(tag.id);
        if (!pos || !pos.visible) return null;

        return (
          <div
            key={tag.id}
            id={`tag-${tag.id}`}
            className="tag-badge"
            style={{
              left: pos.x,
              top: pos.y,
              borderColor: tag.colour,
              '--tag-colour': tag.colour,
            }}
          >
            {/* Dot anchor */}
            <div className="tag-dot" style={{ background: tag.colour }} />
            {/* Label */}
            <div className="tag-pill" style={{ background: tag.colour }}>
              <span className="tag-pill-text">{tag.label}</span>
              <button
                id={`tag-delete-${tag.id}`}
                className="tag-delete-btn"
                onClick={() => dispatch({ type: 'DELETE_TAG', payload: tag.id })}
                aria-label={`Delete tag: ${tag.label}`}
                title="Delete tag"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
