/**
 * Wizard Validation Helpers
 *
 * Provides validation functions for each wizard step.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate customization step data.
 */
export function validateCustomization(data: {
  appName?: string;
  description?: string;
  templateId?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.appName || data.appName.trim().length === 0) {
    errors.push({ field: 'appName', message: 'App name is required' });
  } else if (data.appName.length > 100) {
    errors.push({ field: 'appName', message: 'App name must be 100 characters or less' });
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (data.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be 500 characters or less' });
  }

  if (!data.templateId || data.templateId.trim().length === 0) {
    errors.push({ field: 'templateId', message: 'Template selection is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate review step (confirmation checkbox).
 */
export function validateReview(confirmed: boolean): ValidationResult {
  const errors: ValidationError[] = [];

  if (!confirmed) {
    errors.push({ field: 'reviewConfirmed', message: 'You must confirm the details before submitting' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that customization data exists and is non-empty.
 */
export function validateCustomizationDataExists(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'customizationData', message: 'Customization data is missing' });
  } else if (!data.appName || !data.description || !data.templateId) {
    errors.push({ field: 'customizationData', message: 'Incomplete customization data' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
