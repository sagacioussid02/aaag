'use client';

interface StepThreeProps {
  onSubmit: (input: Record<string, string>) => Promise<void>;
  onBack: () => void;
  templateId: string;
  userInput: Record<string, string>;
  isSubmitting: boolean;
}

export default function StepThree({
  onSubmit,
  onBack,
  templateId,
  userInput,
  isSubmitting,
}: StepThreeProps) {
  const handleSubmit = async () => {
    await onSubmit(userInput);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Review & Submit</h2>
      <p className="text-gray-600 mb-8">Review your information before submitting your order.</p>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="font-bold text-lg mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Template</p>
            <p className="font-medium">{templateId}</p>
          </div>
          <hr className="my-4" />
          <div>
            <p className="text-sm text-gray-600 mb-2">Your Information</p>
            {Object.entries(userInput).map(([key, value]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-medium text-right max-w-xs break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-sm text-blue-800">
          ✓ Your personalized micro-app will be generated and deployed within minutes.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              Submitting...
            </>
          ) : (
            'Submit Order'
          )}
        </button>
      </div>
    </div>
  );
}
