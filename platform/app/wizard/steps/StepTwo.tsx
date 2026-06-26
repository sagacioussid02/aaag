'use client';

import { useState, useEffect } from 'react';

interface StepTwoProps {
  onComplete: (input: Record<string, string>) => void;
  onBack: () => void;
  templateId: string;
  initialInput: Record<string, string>;
}

const TEMPLATE_FIELDS: Record<string, Array<{ name: string; label: string; placeholder: string; type: string }>> = {
  'template-1': [
    { name: 'fullName', label: 'Full Name', placeholder: 'John Doe', type: 'text' },
    { name: 'title', label: 'Professional Title', placeholder: 'Software Engineer', type: 'text' },
    { name: 'bio', label: 'Bio', placeholder: 'Tell us about yourself...', type: 'textarea' },
    { name: 'email', label: 'Email', placeholder: 'john@example.com', type: 'email' },
  ],
  'template-2': [
    { name: 'blogTitle', label: 'Blog Title', placeholder: 'My Awesome Blog', type: 'text' },
    { name: 'tagline', label: 'Tagline', placeholder: 'Thoughts on tech and life', type: 'text' },
    { name: 'authorName', label: 'Author Name', placeholder: 'John Doe', type: 'text' },
  ],
  'template-3': [
    { name: 'storeName', label: 'Store Name', placeholder: 'My Store', type: 'text' },
    { name: 'productCategory', label: 'Product Category', placeholder: 'Electronics', type: 'text' },
    { name: 'ownerName', label: 'Owner Name', placeholder: 'John Doe', type: 'text' },
  ],
  'template-4': [
    { name: 'eventName', label: 'Event Name', placeholder: 'My Event', type: 'text' },
    { name: 'eventDate', label: 'Event Date', placeholder: '2024-12-31', type: 'date' },
    { name: 'eventDescription', label: 'Description', placeholder: 'Tell us about your event...', type: 'textarea' },
  ],
};

export default function StepTwo({
  onComplete,
  onBack,
  templateId,
  initialInput,
}: StepTwoProps) {
  const fields = TEMPLATE_FIELDS[templateId] || [];
  const [formData, setFormData] = useState<Record<string, string>>(initialInput);

  useEffect(() => {
    // Initialize form with empty values for all fields
    const newFormData: Record<string, string> = {};
    fields.forEach((field) => {
      newFormData[field.name] = initialInput[field.name] || '';
    });
    setFormData(newFormData);
  }, [templateId, fields, initialInput]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContinue = () => {
    // Validate that all fields are filled
    const allFilled = fields.every((field) => formData[field.name]?.trim());
    if (allFilled) {
      onComplete(formData);
    }
  };

  const allFilled = fields.every((field) => formData[field.name]?.trim());

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Customize Your Site</h2>
      <p className="text-gray-600 mb-8">Fill in the details to personalize your template.</p>

      <div className="space-y-6 mb-8">
        {fields.map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            ) : (
              <input
                id={field.name}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!allFilled}
          className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Review & Submit
        </button>
      </div>
    </div>
  );
}
