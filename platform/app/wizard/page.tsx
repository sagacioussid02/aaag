'use client';

import { useState } from 'react';
import { WizardStateMachine, WizardStep } from '@/lib/wizard-state-machine';
import {
  validateCustomization,
  validateReview,
  validateCustomizationDataExists,
} from '@/lib/wizard-validation';

/**
 * Wizard Page Component
 *
 * Implements the No-Code Wizard happy path:
 * landing → customization → review → submit → confirmation
 *
 * State transitions are guarded by the WizardStateMachine.
 */

export default function WizardPage() {
  const [stateMachine] = useState(() => new WizardStateMachine('landing'));
  const [currentStep, setCurrentStep] = useState<WizardStep>('landing');
  const [customizationData, setCustomizationData] = useState({
    appName: '',
    description: '',
    templateId: '',
  });
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Attempt to transition to the next step.
   * Validates state machine guards and step-specific validation.
   */
  const handleTransition = async (targetStep: WizardStep) => {
    setErrors({});

    // Check if transition is allowed by state machine
    if (!stateMachine.canTransition(targetStep)) {
      setErrors({
        _global: `Cannot navigate from ${currentStep} to ${targetStep}`,
      });
      return;
    }

    // Validate step-specific data before transitioning
    if (targetStep === 'review') {
      const validation = validateCustomization(customizationData);
      if (!validation.isValid) {
        const errorMap = validation.errors.reduce(
          (acc, err) => ({ ...acc, [err.field]: err.message }),
          {}
        );
        setErrors(errorMap);
        return;
      }
      stateMachine.setCustomizationData(customizationData);
    }

    if (targetStep === 'submit') {
      const validation = validateReview(reviewConfirmed);
      if (!validation.isValid) {
        const errorMap = validation.errors.reduce(
          (acc, err) => ({ ...acc, [err.field]: err.message }),
          {}
        );
        setErrors(errorMap);
        return;
      }
      stateMachine.confirmReview();
    }

    // Perform state machine transition
    try {
      stateMachine.transitionTo(targetStep);
      setCurrentStep(targetStep);
    } catch (error) {
      setErrors({
        _global: error instanceof Error ? error.message : 'Transition failed',
      });
    }
  };

  /**
   * Submit the order (from submit step to confirmation).
   */
  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Call API to create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: customizationData.appName,
          description: customizationData.description,
          templateId: customizationData.templateId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { orderId: newOrderId } = await response.json();
      stateMachine.setOrderId(newOrderId);
      setOrderId(newOrderId);

      // Transition to confirmation
      stateMachine.transitionTo('confirmation');
      setCurrentStep('confirmation');
    } catch (error) {
      setErrors({
        _global: error instanceof Error ? error.message : 'Order submission failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset wizard to landing.
   */
  const handleReset = () => {
    stateMachine.reset();
    setCurrentStep('landing');
    setCustomizationData({ appName: '', description: '', templateId: '' });
    setReviewConfirmed(false);
    setOrderId(null);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Global error message */}
        {errors._global && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {errors._global}
          </div>
        )}

        {/* Landing Step */}
        {currentStep === 'landing' && (
          <div>
            <h1 className="text-4xl font-bold mb-4">No Code. Ready in Minutes.</h1>
            <p className="text-lg text-gray-600 mb-8">
              Create a personalized micro-app without writing a single line of code.
            </p>
            <button
              onClick={() => handleTransition('customization')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Customization Step */}
        {currentStep === 'customization' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Customize Your App</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={customizationData.appName}
                  onChange={(e) =>
                    setCustomizationData({ ...customizationData, appName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="My Awesome App"
                />
                {errors.appName && (
                  <p className="text-red-600 text-sm mt-1">{errors.appName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={customizationData.description}
                  onChange={(e) =>
                    setCustomizationData({ ...customizationData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="What does your app do?"
                  rows={4}
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={customizationData.templateId}
                  onChange={(e) =>
                    setCustomizationData({ ...customizationData, templateId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a template</option>
                  <option value="template-1">Template 1: Blog</option>
                  <option value="template-2">Template 2: Portfolio</option>
                  <option value="template-3">Template 3: E-commerce</option>
                </select>
                {errors.templateId && (
                  <p className="text-red-600 text-sm mt-1">{errors.templateId}</p>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => handleTransition('landing')}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => handleTransition('review')}
                className="flex-1 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Review Your App</h2>
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <p className="mb-2">
                <strong>App Name:</strong> {customizationData.appName}
              </p>
              <p className="mb-2">
                <strong>Description:</strong> {customizationData.description}
              </p>
              <p>
                <strong>Template:</strong> {customizationData.templateId}
              </p>
            </div>
            <div className="mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reviewConfirmed}
                  onChange={(e) => setReviewConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-700">
                  I confirm the details above are correct
                </span>
              </label>
              {errors.reviewConfirmed && (
                <p className="text-red-600 text-sm mt-2">{errors.reviewConfirmed}</p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleTransition('customization')}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => handleTransition('submit')}
                className="flex-1 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                disabled={!reviewConfirmed}
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Submit Step */}
        {currentStep === 'submit' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Complete Your Order</h2>
            <p className="text-gray-600 mb-6">
              Click below to complete your order and deploy your app.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleTransition('review')}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Order'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {currentStep === 'confirmation' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="inline-block w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Order Confirmed!</h2>
            <p className="text-gray-600 mb-2">Your app is being deployed.</p>
            <p className="text-lg font-semibold text-indigo-600 mb-8">Order ID: {orderId}</p>
            <button
              onClick={handleReset}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700"
            >
              Create Another App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
