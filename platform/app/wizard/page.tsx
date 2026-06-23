'use client';

import { useState } from 'react';
import { WizardFormData } from '@/types/order';
import { createOrder, ApiError } from '@/lib/api';
import ErrorDisplay from '@/components/error-display';

const TEMPLATES = [
  { id: 'template_1', name: 'Birthday Gift' },
  { id: 'template_2', name: 'Anniversary' },
  { id: 'template_3', name: 'Thank You' },
];

const STEPS = [
  { title: 'Select Template', description: 'Choose a template for your gift' },
  { title: 'Personalize', description: 'Add recipient details and message' },
  { title: 'Review & Pay', description: 'Review and complete payment' },
];

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    template_id: '',
    recipient_name: '',
    email: '',
    gift_message: '',
  });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    field: keyof WizardFormData,
    value: WizardFormData[keyof WizardFormData]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user corrects the field
    if (error?.field === field) {
      setError(null);
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    if (step === 0) {
      if (!formData.template_id) {
        setError({ message: 'Please select a template', field: 'template_id' });
        return false;
      }
    } else if (step === 1) {
      if (!formData.recipient_name) {
        setError({ message: 'Recipient name is required', field: 'recipient_name' });
        return false;
      }
      if (!formData.gift_message) {
        setError({ message: 'Gift message is required', field: 'gift_message' });
        return false;
      }
    } else if (step === 2) {
      if (!formData.email) {
        setError({ message: 'Email is required', field: 'email' });
        return false;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError({ message: 'Please enter a valid email address', field: 'email' });
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await createOrder({
        template_id: formData.template_id,
        recipient_name: formData.recipient_name,
        email: formData.email,
        gift_message: formData.gift_message,
        wizard_data: formData.additionalData || {},
      });

      // Success: redirect to order confirmation or dashboard
      console.log('Order created:', response);
      // TODO: Redirect to confirmation page or dashboard
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) {
          // Display first field error
          const firstField = Object.keys(err.fieldErrors)[0];
          setError({
            message: err.fieldErrors[firstField],
            field: firstField,
          });
        } else {
          setError({ message: err.message });
        }
      } else {
        setError({ message: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={`flex-1 text-center ${
                  index < currentStep ? 'opacity-100' : index === currentStep ? 'opacity-100' : 'opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    index <= currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <p className="text-sm font-medium">{step.title}</p>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-2">{STEPS[currentStep].title}</h2>
          <p className="text-gray-600 mb-6">{STEPS[currentStep].description}</p>

          {error && <ErrorDisplay error={error} />}

          {/* Step 0: Select Template */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                  style={{
                    borderColor: formData.template_id === template.id ? '#4f46e5' : '#e5e7eb',
                    backgroundColor: formData.template_id === template.id ? '#eef2ff' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={formData.template_id === template.id}
                    onChange={(e) => handleInputChange('template_id', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="ml-3 font-medium">{template.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* Step 1: Personalize */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter recipient's name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gift Message
                </label>
                <textarea
                  value={formData.gift_message}
                  onChange={(e) => handleInputChange('gift_message', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Write a personalized message"
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 2: Review & Pay */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <p className="text-sm text-gray-600">Template: {formData.template_id}</p>
                <p className="text-sm text-gray-600">Recipient: {formData.recipient_name}</p>
                <p className="text-sm text-gray-600">Email: {formData.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Submit Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
