'use client';

import React, { useState, useCallback } from 'react';
import { useWizardState } from './hooks/useWizardState';
import StepOne from './steps/StepOne';
import StepTwo from './steps/StepTwo';
import StepThree from './steps/StepThree';

const TEMPLATES = [
  { id: 'template-1', name: 'Portfolio' },
  { id: 'template-2', name: 'Blog' },
  { id: 'template-3', name: 'E-commerce' },
];

export default function WizardPage() {
  const {
    currentStep,
    data,
    error,
    validateStep,
    transitionToStep,
    updateStepData,
    setError,
    clearError,
  } = useWizardState();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStepOneComplete = useCallback(
    (stepData: Record<string, any>) => {
      updateStepData(1, stepData);
      if (validateStep(1, stepData)) {
        clearError();
        transitionToStep(2);
      }
    },
    [validateStep, transitionToStep, updateStepData, clearError]
  );

  const handleStepTwoComplete = useCallback(
    (stepData: Record<string, any>) => {
      updateStepData(2, stepData);
      if (validateStep(2, stepData)) {
        clearError();
        transitionToStep(3);
      } else {
        setError('Please fill in all required fields');
      }
    },
    [validateStep, transitionToStep, updateStepData, setError, clearError]
  );

  const handleStepTwoError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage);
    },
    [setError]
  );

  const handleStepThreeSubmit = useCallback(
    async (stepData: Record<string, any>) => {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stepData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status >= 400 && response.status < 500) {
            // Validation error
            setError(errorData.error || 'Validation failed');
          } else {
            // Server error
            setError('Server error: ' + (errorData.error || 'Please try again'));
          }
          return;
        }

        const result = await response.json();
        clearError();
        // Handle successful submission
        console.log('Order submitted:', result);
      } catch (err) {
        setError('Failed to submit order: ' + (err instanceof Error ? err.message : 'Unknown error'));
      } finally {
        setIsSubmitting(false);
      }
    },
    [setError, clearError]
  );

  const handleStepThreeError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage);
    },
    [setError]
  );

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      clearError();
      transitionToStep(currentStep - 1);
    }
  }, [currentStep, transitionToStep, clearError]);

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h1>Create Your Personalized App</h1>
        <p>Step {currentStep} of 3</p>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="wizard-content">
        {currentStep === 1 && (
          <StepOne
            templates={TEMPLATES}
            selectedTemplate={data[1]?.templateId || null}
            onComplete={handleStepOneComplete}
          />
        )}

        {currentStep === 2 && (
          <StepTwo
            data={data[2] || {}}
            onComplete={handleStepTwoComplete}
            onError={handleStepTwoError}
          />
        )}

        {currentStep === 3 && (
          <StepThree
            data={{
              ...data[1],
              ...data[2],
              ...data[3],
            }}
            templates={TEMPLATES}
            onComplete={handleStepThreeSubmit}
            onError={handleStepThreeError}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      <div className="wizard-footer">
        {currentStep > 1 && (
          <button onClick={handleBack} disabled={isSubmitting}>
            Back
          </button>
        )}
      </div>
    </div>
  );
}
