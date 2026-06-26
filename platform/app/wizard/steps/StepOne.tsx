'use client';

import { useState } from 'react';

interface StepOneProps {
  onComplete: (templateId: string) => void;
  selectedTemplate: string | null;
}

const TEMPLATES = [
  {
    id: 'template-1',
    name: 'Personal Portfolio',
    description: 'Showcase your work and skills with a modern portfolio site.',
    icon: '🎨',
  },
  {
    id: 'template-2',
    name: 'Blog',
    description: 'Start a blog and share your thoughts with the world.',
    icon: '📝',
  },
  {
    id: 'template-3',
    name: 'E-Commerce Store',
    description: 'Launch an online store to sell your products.',
    icon: '🛍️',
  },
  {
    id: 'template-4',
    name: 'Event Landing Page',
    description: 'Create a landing page for your event or product launch.',
    icon: '🎉',
  },
];

export default function StepOne({ onComplete, selectedTemplate }: StepOneProps) {
  const [selected, setSelected] = useState<string | null>(selectedTemplate);

  const handleSelect = (templateId: string) => {
    setSelected(templateId);
  };

  const handleContinue = () => {
    if (selected) {
      onComplete(selected);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Choose Your Template</h2>
      <p className="text-gray-600 mb-8">
        Select a template to get started. You'll customize it in the next step.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`p-6 rounded-lg border-2 transition-all text-left ${
              selected === template.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 bg-white hover:border-indigo-300'
            }`}
          >
            <div className="text-4xl mb-2">{template.icon}</div>
            <h3 className="font-bold text-lg mb-2">{template.name}</h3>
            <p className="text-gray-600 text-sm">{template.description}</p>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Continue to Customization
      </button>
    </div>
  );
}
