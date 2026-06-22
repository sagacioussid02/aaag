'use client';

/**
 * useWizardState
 *
 * Custom hook for managing wizard state transitions and validation.
 * Ensures all steps are reachable and transitions are correct.
 *
 * Validation rules:
 * - Step 1: templateId must be selected
 * - Step 2: all required fields must be filled
 * - Step 3: ready to submit (no additional validation needed)
 */

export function useWizardState() {
  /**
   * Validates the current step before allowing transition to the next step.
   *
   * @param step - The current step number (1, 2, or 3)
   * @param data - The data to validate for this step
   * @returns true if validation passes, false otherwise
   */
  const validateStep = (step: number, data: Record<string, any>): boolean => {
    switch (step) {
      case 1:
        // Step 1: Validate template selection
        return !!data.templateId && typeof data.templateId === 'string' && data.templateId.trim().length > 0;

      case 2:
        // Step 2: Validate that all required fields are filled
        // Check that data object has at least one field and all values are non-empty strings
        const hasFields = Object.keys(data).length > 0;
        const allFieldsFilled = Object.values(data).every(
          (value) => typeof value === 'string' && value.trim().length > 0
        );
        return hasFields && allFieldsFilled;

      case 3:
        // Step 3: No additional validation needed; submission is handled in the parent component
        return true;

      default:
        return false;
    }
  };

  /**
   * Determines if a transition from one step to another is allowed.
   *
   * @param fromStep - The current step
   * @param toStep - The target step
   * @returns true if the transition is allowed, false otherwise
   */
  const transitionToStep = (fromStep: number, toStep: number): boolean => {
    // Allow forward transitions (1→2, 2→3) and backward transitions (3→2, 2→1)
    const diff = Math.abs(toStep - fromStep);
    return diff === 1 && toStep >= 1 && toStep <= 3;
  };

  return {
    validateStep,
    transitionToStep,
  };
}
