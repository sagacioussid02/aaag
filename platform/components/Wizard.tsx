'use client';

import { useState } from 'react';
import { submitOrder, ValidationError } from '@/lib/api';

interface WizardStep {
  id: string;
  title: string;
  fields: string[];
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'template',
    title: 'Choose a Template',
    fields: ['template_id'],
  },
  {
    id: 'personalization',
    title: 'Personalize Your App',
    fields: ['personalization_data'],
  },
  {
    id: 'contact',
    title: 'Your Contact Info',
    fields: ['user_name', 'user_email'],
  },
];

export default function Wizard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({
    template_id: '',
    user_name: '',
    user_email: '',
    personalization_data: {} as Record<string, string>,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currentStep = WIZARD_STEPS[currentStepIndex];

  const handleFieldChange = (field: string, value: string) => {
    if (field.startsWith('personalization_')) {
      const key = field.replace('personalization_', '');
      setFormData(prev => ({
        ...prev,
        personalization_data: {
          ...prev.personalization_data,
          [key]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    // Clear error for this field when user starts typing
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handleNext = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await submitOrder(formData);
      setSubmitSuccess(true);
    } catch (error: unknown) {
      const err = error as Error & { details?: ValidationError[] };
      
      // Map validation errors to field names for inline display
      if (err.details && Array.isArray(err.details)) {
        const errors: Record<string, string> = {};
        err.details.forEach((detail: ValidationError) => {
          errors[detail.field] = detail.message;
        });
        setFieldErrors(errors);
      } else {
        // Generic error message if no field-level details
        setFieldErrors({ _form: err.message || 'An error occurred. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="wizard-success">
        <h2>Success!</h2>
        <p>Your personalized app is being created. Check your email for updates.</p>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      <div className="wizard-progress">
        {WIZARD_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
          >
            {step.title}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="wizard-form">
        <div className="wizard-step">
          <h2>{currentStep.title}</h2>

          {fieldErrors._form && (
            <div className="error-message form-level">{fieldErrors._form}</div>
          )}

          {currentStep.id === 'template' && (
            <div className="form-group">
              <label htmlFor="template_id">Select a Template</label>
              <select
                id="template_id"
                value={formData.template_id}
                onChange={e => handleFieldChange('template_id', e.target.value)}
              >
                <option value="">-- Choose --</option>
                <option value="template_1">Template 1</option>
                <option value="template_2">Template 2</option>
              </select>
              {fieldErrors.template_id && (
                <div className="error-message">{fieldErrors.template_id}</div>
              )}
            </div>
          )}

          {currentStep.id === 'personalization' && (
            <div className="form-group">
              <label htmlFor="personalization_theme">Theme Color</label>
              <input
                id="personalization_theme"
                type="text"
                placeholder="e.g., blue, red"
                value={formData.personalization_data.theme || ''}
                onChange={e => handleFieldChange('personalization_theme', e.target.value)}
              />
              {fieldErrors.personalization_theme && (
                <div className="error-message">{fieldErrors.personalization_theme}</div>
              )}
            </div>
          )}

          {currentStep.id === 'contact' && (
            <>
              <div className="form-group">
                <label htmlFor="user_name">Your Name</label>
                <input
                  id="user_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.user_name}
                  onChange={e => handleFieldChange('user_name', e.target.value)}
                />
                {fieldErrors.user_name && (
                  <div className="error-message">{fieldErrors.user_name}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="user_email">Your Email</label>
                <input
                  id="user_email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.user_email}
                  onChange={e => handleFieldChange('user_email', e.target.value)}
                />
                {fieldErrors.user_email && (
                  <div className="error-message">{fieldErrors.user_email}</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="wizard-actions">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="btn btn-secondary"
          >
            Previous
          </button>

          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Submitting...' : 'Create My App'}
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .wizard-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .wizard-progress {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .progress-step {
          flex: 1;
          padding: 0.5rem;
          text-align: center;
          border-bottom: 2px solid #ddd;
          font-size: 0.875rem;
          color: #666;
        }

        .progress-step.active {
          border-bottom-color: #0070f3;
          color: #0070f3;
          font-weight: 600;
        }

        .progress-step.completed {
          border-bottom-color: #10b981;
          color: #10b981;
        }

        .wizard-form {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 2rem;
          background: #fff;
        }

        .wizard-step h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #0070f3;
          box-shadow: 0 0 0 3px rgba(0, 112, 243, 0.1);
        }

        .error-message {
          color: #dc2626;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .error-message.form-level {
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }

        .wizard-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          justify-content: space-between;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #0070f3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0051cc;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #d1d5db;
        }

        .btn-secondary:disabled {
          background: #f3f4f6;
          color: #999;
          cursor: not-allowed;
        }

        .wizard-success {
          text-align: center;
          padding: 2rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          border-radius: 8px;
        }

        .wizard-success h2 {
          color: #10b981;
          margin-top: 0;
        }
      `}</style>
    </div>
  );
}
