'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder, ApiError } from '@/lib/api';
import { WizardFormData } from '@/types/order';
import { ErrorDisplay } from './error-display';

/**
 * No-code wizard page.
 * Guides users through creating a personalized micro-app.
 */
export default function WizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    email: '',
    template_id: 'template-1', // Default template
    recipient_name: '',
    gift_message: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      title: 'Choose a Template',
      description: 'Select a pre-built micro-app template',
    },
    {
      title: 'Personalize',
      description: 'Customize the app with your content',
    },
    {
      title: 'Recipient Info',
      description: 'Who is this gift for?',
    },
    {
      title: 'Review & Submit',
      description: 'Confirm your order',
    },
  ];

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts correcting
    if (error && errorField === field) {
      setError(null);
      setErrorField(undefined);
    }
  };

  const handleNext = () => {
    // Validate current step before moving forward
    if (currentStep === 0 && !formData.template_id) {
      setError('Please select a template');
      setErrorField('template_id');
      return;
    }
    if (currentStep === 2 && !formData.email) {
      setError('Email is required');
      setErrorField('email');
      return;
    }
    setError(null);
    setErrorField(undefined);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setError(null);
    setErrorField(undefined);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setErrorField(undefined);

    // Final validation
    if (!formData.email) {
      setError('Email is required');
      setErrorField('email');
      return;
    }
    if (!formData.template_id) {
      setError('Template selection is required');
      setErrorField('template_id');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await createOrder({
        email: formData.email,
        template_id: formData.template_id,
        recipient_name: formData.recipient_name,
        gift_message: formData.gift_message,
        wizard_data: formData,
      });

      // Success: redirect to order confirmation or payment
      if (response.payment_url) {
        router.push(response.payment_url);
      } else {
        router.push(`/order/${response.id}`);
      }
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.field) {
          setErrorField(err.field);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Your Personalized Micro-App
          </h1>
          <p className="text-lg text-gray-600">
            No coding required. Ready in minutes.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex-1 h-2 mx-1 rounded-full ${
                  index <= currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600 mb-6">{steps[currentStep].description}</p>

          {/* Error Display */}
          <ErrorDisplay
            error={error}
            field={errorField}
            onDismiss={() => {
              setError(null);
              setErrorField(undefined);
            }}
          />

          {/* Step Content */}
          <div className="mb-8">
            {currentStep === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Select a Template
                </label>
                <div className="space-y-3">
                  {[
                    { id: 'template-1', name: 'Portfolio' },
                    { id: 'template-2', name: 'Blog' },
                    { id: 'template-3', name: 'E-commerce' },
                  ].map((template) => (
                    <label key={template.id} className="flex items-center">
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={formData.template_id === template.id}
                        onChange={(e) =>
                          handleInputChange('template_id', e.target.value)
                        }
                        className="h-4 w-4 text-indigo-600"
                      />
                      <span className="ml-3 text-gray-700">{template.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customize Your App
                </label>
                <textarea
                  placeholder="Describe what you want in your personalized app..."
                  value={(formData.wizard_data?.customization as string) || ''}
                  onChange={(e) =>
                    handleInputChange('wizard_data', {
                      ...formData.wizard_data,
                      customization: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="Who is this gift for?"
                    value={formData.recipient_name || ''}
                    onChange={(e) =>
                      handleInputChange('recipient_name', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gift Message (Optional)
                  </label>
                  <textarea
                    placeholder="Add a personal message..."
                    value={formData.gift_message || ''}
                    onChange={(e) =>
                      handleInputChange('gift_message', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Template:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.template_id}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Recipient:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.recipient_name || 'Not specified'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="font-medium text-gray-900">
                      {formData.email}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Create Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
