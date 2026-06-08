'use client';

import { useState } from 'react';
import { generateMicroApp } from '@/lib/api-client';

interface GeneratedApp {
  title: string;
  description: string;
  code: string;
  gift_url?: string;
}

export default function WizardPage() {
  const [formData, setFormData] = useState({
    recipient_name: '',
    occasion: '',
    theme: '',
    custom_message: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedApp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await generateMicroApp(formData);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate micro-app');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create a Gift Micro-App</h1>
        <p className="text-gray-600 mb-8">Personalize a micro-app for someone special in minutes.</p>

        {!result ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div>
              <label htmlFor="recipient_name" className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name
              </label>
              <input
                type="text"
                id="recipient_name"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Sarah"
              />
            </div>

            <div>
              <label htmlFor="occasion" className="block text-sm font-medium text-gray-700 mb-2">
                Occasion
              </label>
              <select
                id="occasion"
                name="occasion"
                value={formData.occasion}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select an occasion</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="graduation">Graduation</option>
                <option value="promotion">Promotion</option>
                <option value="thank_you">Thank You</option>
              </select>
            </div>

            <div>
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select a theme</option>
                <option value="adventure">Adventure</option>
                <option value="wellness">Wellness</option>
                <option value="creativity">Creativity</option>
                <option value="learning">Learning</option>
              </select>
            </div>

            <div>
              <label htmlFor="custom_message" className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (Optional)
              </label>
              <textarea
                id="custom_message"
                name="custom_message"
                value={formData.custom_message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add a personal message..."
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Generating...' : 'Generate Micro-App'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{result.title}</h2>
            <p className="text-gray-600 mb-6">{result.description}</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 font-mono text-sm overflow-auto max-h-64">
              <pre>{result.code}</pre>
            </div>
            {result.gift_url && (
              <a
                href={result.gift_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                View Micro-App
              </a>
            )}
            <button
              onClick={() => {
                setResult(null);
                setFormData({ recipient_name: '', occasion: '', theme: '', custom_message: '' });
              }}
              className="ml-4 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-6 rounded-lg transition"
            >
              Create Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
