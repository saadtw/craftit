import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Editor3DWrapper from '../Editor3DWrapper';

// Mock the internal engine components
jest.mock('../../3d-engine/components/EditorCanvas', () => {
  return function MockEditorCanvas({ modelUrl }: { modelUrl: string }) {
    return <div data-testid="mock-editor-canvas" data-url={modelUrl}>Mock Editor Canvas</div>;
  };
});

jest.mock('../../3d-engine/components/TagOverlay', () => {
  return function MockTagOverlay() {
    return <div data-testid="mock-tag-overlay">Mock Tag Overlay</div>;
  };
});

jest.mock('../../3d-engine/components/Toolbar', () => {
  return function MockToolbar({ onSave, readOnly }: { onSave?: any, readOnly?: boolean }) {
    if (readOnly) return <div data-testid="mock-toolbar-readonly">Toolbar is Read-Only</div>;
    return (
      <div data-testid="mock-toolbar">
        <button 
          data-testid="mock-save-button" 
          onClick={() => onSave?.(new Blob(), [], null)}
        >
          Mock Save Button
        </button>
      </div>
    );
  };
});

describe('Editor3DWrapper', () => {
  const defaultProps = {
    modelUrl: 'https://example.com/model.glb',
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully passes the modelUrl down to the EditorCanvas', () => {
    render(<Editor3DWrapper {...defaultProps} />);
    
    const canvas = screen.getByTestId('mock-editor-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-url', 'https://example.com/model.glb');
  });

  it('handles read-only mode correctly by passing readOnly prop down', () => {
    render(<Editor3DWrapper {...defaultProps} readOnly={true} />);
    
    // In our mock, if readOnly is true, it renders a specific div and the save button shouldn't exist
    expect(screen.getByTestId('mock-toolbar-readonly')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-save-button')).not.toBeInTheDocument();
  });

  it('fires the onSave callback exactly once when the save button is clicked', () => {
    const mockOnSave = jest.fn();
    render(<Editor3DWrapper {...defaultProps} onSave={mockOnSave} />);
    
    const saveButton = screen.getByTestId('mock-save-button');
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(expect.any(Blob), expect.any(Array), null);
  });
});
