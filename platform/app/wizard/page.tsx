'use client';

import { useState, useCallback } from 'react';
import StepOne from './steps/StepOne';
import StepTwo from './steps/StepTwo';
import StepThree from './steps/StepThree';
import { useWizardState } from './hooks/useWizardState';

type WizardStep = 1 | 2 | 3;

interface WizardState {
  currentStep: WizardStep;
  templateId: string | null;
  userInput: Record<string, string>;
  validationError: string | null;
  isSubmitting: boolean;
}

export default function WizardPage() {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 1,
    templateId: null,
    userInput: {},
    validationError: null,
    isSubmitting: false,
  });

  const { validateStep, transitionToStep } = useWizardState();

  const handleStepOneComplete = useCallback(
    (templateId: string) => {
      const isValid = validateStep(1, { templateId });
      if (isValid) {
        setWizardState((prev) => ({
          ...prev,
          templateId,
          currentStep: 2,
          validationError: null,
        }));
      } else {
        setWizardState((prev) => ({
          ...prev,
          validationError: 'Please select a template to continue.',
        }));
      }
    },
    [validateStep]
  );

  const handleStepTwoComplete = useCallback(
    (input: Record<string, string>) => {
      const isValid = validateStep(2, input);
      if (isValid) {
        setWizardState((prev) => ({
          ...prev,
          userInput: input,
          currentStep: 3,
          validationError: null,
        }));
      } else {
        setWizardState((prev) => ({
          ...prev,
          validationError: 'Please fill in all required fields.',
        }));
      }
    },
    [validateStep]
  );

  const handleStepThreeSubmit = useCallback(
    async (input: Record<string, string>) => {
      setWizardState((prev) => ({
        ...prev,
        isSubmitting: true,
        validationError: null,
      }));

      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: wizardState.templateId,
            userInput: { ...wizardState.userInput, ...input },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          setWizardState((prev) => ({
            ...prev,
            validationError: error.message || 'Failed to submit order. Please try again.',
            isSubmitting: false,
          }));
          return;
        }

        // Order submitted successfully
        const order = await response.json();
        // Redirect to order confirmation or dashboard
        window.location.href = `/dashboard/orders/${order.id}`;
      } catch (err) {
        setWizardState((prev) => ({
          ...prev,
          validationError: 'An unexpected error occurred. Please try again.',
          isSubmitting: false,
        }));
      }
    },
    [wizardState.templateId, wizardState.userInput]
  );

  const handleBack = useCallback(() => {
    setWizardState((prev) => {
      const prevStep = Math.max(1, prev.currentStep - 1) as WizardStep;
      return {
        ...prev,
        currentStep: prevStep,
        validationError: null,
      };
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step <= wizardState.currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < wizardState.currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error message display */}
        {wizardState.validationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{wizardState.validationError}</p>
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {wizardState.currentStep === 1 && (
            <StepOne onComplete={handleStepOneComplete} selectedTemplate={wizardState.templateId} />
          )}
          {wizardState.currentStep === 2 && (
            <StepTwo
              onComplete={handleStepTwoComplete}
              onBack={handleBack}
              templateId={wizardState.templateId || ''}
              initialInput={wizardState.userInput}
            />
          )}
          {wizardState.currentStep === 3 && (
            <StepThree
              onSubmit={handleStepThreeSubmit}
              onBack={handleBack}
              templateId={wizardState.templateId || ''}
              userInput={wizardState.userInput}
              isSubmitting={wizardState.isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
