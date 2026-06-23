import { renderHook, act } from '@testing-library/react';
import { useWizardState } from '../useWizardState';

describe('useWizardState', () => {
  describe('validateStep', () => {
    it('should validate step 1 with valid templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const isValid = result.current.validateStep(1, { templateId: 'template-1' });
      expect(isValid).toBe(true);
    });

    it('should reject step 1 with empty templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const isValid = result.current.validateStep(1, { templateId: '' });
      expect(isValid).toBe(false);
    });

    it('should reject step 1 with null templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const isValid = result.current.validateStep(1, { templateId: null });
      expect(isValid).toBe(false);
    });

    it('should reject step 1 with undefined templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const isValid = result.current.validateStep(1, { templateId: undefined });
      expect(isValid).toBe(false);
    });

    it('should reject step 1 with whitespace-only templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const isValid = result.current.validateStep(1, { templateId: '   ' });
      expect(isValid).toBe(false);
    });

    it('should validate step 2 with all required fields non-empty', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'My app description',
      };
      const isValid = result.current.validateStep(2, data);
      expect(isValid).toBe(true);
    });

    it('should reject step 2 with empty name', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        name: '',
        email: 'john@example.com',
        description: 'My app description',
      };
      const isValid = result.current.validateStep(2, data);
      expect(isValid).toBe(false);
    });

    it('should reject step 2 with empty email', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        name: 'John Doe',
        email: '',
        description: 'My app description',
      };
      const isValid = result.current.validateStep(2, data);
      expect(isValid).toBe(false);
    });

    it('should reject step 2 with empty description', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        description: '',
      };
      const isValid = result.current.validateStep(2, data);
      expect(isValid).toBe(false);
    });

    it('should reject step 2 with missing fields', () => {
      const { result } = renderHook(() => useWizardState());
      const data = { name: 'John Doe' };
      const isValid = result.current.validateStep(2, data);
      expect(isValid).toBe(false);
    });

    it('should validate step 3 with valid data', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        templateId: 'template-1',
        name: 'John Doe',
        email: 'john@example.com',
        description: 'My app',
      };
      const isValid = result.current.validateStep(3, data);
      expect(isValid).toBe(true);
    });

    it('should reject step 3 with missing templateId', () => {
      const { result } = renderHook(() => useWizardState());
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'My app',
      };
      const isValid = result.current.validateStep(3, data);
      expect(isValid).toBe(false);
    });
  });

  describe('transitionToStep', () => {
    it('should allow forward transition from step 1 to 2', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.transitionToStep(2);
      });
      expect(result.current.currentStep).toBe(2);
    });

    it('should allow backward transition from step 2 to 1', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.transitionToStep(2);
      });
      act(() => {
        result.current.transitionToStep(1);
      });
      expect(result.current.currentStep).toBe(1);
    });

    it('should reject transition from step 1 to 3 (skip step)', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.transitionToStep(3);
      });
      expect(result.current.currentStep).toBe(1);
    });

    it('should reject transition to step 0 (out of range)', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.transitionToStep(0);
      });
      expect(result.current.currentStep).toBe(1);
    });

    it('should reject transition to step 4 (out of range)', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.transitionToStep(4);
      });
      expect(result.current.currentStep).toBe(1);
    });
  });

  describe('error state management', () => {
    it('should set error on validation failure', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.setError('Validation failed');
      });
      expect(result.current.error).toBe('Validation failed');
    });

    it('should clear error when clearError is called', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.setError('Validation failed');
      });
      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });

    it('should clear error on successful transition', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.setError('Previous error');
      });
      act(() => {
        result.current.transitionToStep(2);
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('data management', () => {
    it('should update step data', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.updateStepData(1, { templateId: 'template-1' });
      });
      expect(result.current.data[1]).toEqual({ templateId: 'template-1' });
    });

    it('should merge step data on multiple updates', () => {
      const { result } = renderHook(() => useWizardState());
      act(() => {
        result.current.updateStepData(2, { name: 'John' });
      });
      act(() => {
        result.current.updateStepData(2, { email: 'john@example.com' });
      });
      expect(result.current.data[2]).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });
  });
});
