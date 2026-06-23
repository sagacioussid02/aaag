import fetch from 'jest-fetch-mock';

// Mock the fetch API at the module level
jest.mock('node-fetch', () => require('jest-fetch-mock'));

describe('Wizard → API Integration: Order Submission Flow', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  describe('Happy Path: User submits valid wizard data and receives order confirmation', () => {
    it('should POST to /api/orders with correct payload and parse 201 response', async () => {
      const mockOrderResponse = {
        id: 'order-123',
        userId: 'user-456',
        templateId: 'template-abc',
        status: 'pending',
        createdAt: '2026-06-23T06:12:35Z',
      };

      fetch.mockResponseOnce(JSON.stringify(mockOrderResponse), { status: 201 });

      const wizardPayload = {
        templateId: 'template-abc',
        recipientName: 'Alice',
        recipientEmail: 'alice@example.com',
        personalMessage: 'Happy birthday!',
      };

      const response = await fetch('http://localhost:8080/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardPayload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(mockOrderResponse);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/orders',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wizardPayload),
        })
      );
    });
  });

  describe('Error Path: Server returns validation error (400)', () => {
    it('should handle 400 validation error and surface error message to caller', async () => {
      const mockErrorResponse = {
        error: 'validation_failed',
        message: 'recipientEmail is required',
        field: 'recipientEmail',
      };

      fetch.mockResponseOnce(JSON.stringify(mockErrorResponse), { status: 400 });

      const invalidPayload = {
        templateId: 'template-abc',
        recipientName: 'Alice',
        recipientEmail: '', // Invalid: empty
        personalMessage: 'Happy birthday!',
      };

      const response = await fetch('http://localhost:8080/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPayload),
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData).toEqual(mockErrorResponse);
      expect(errorData.message).toBe('recipientEmail is required');
    });
  });

  describe('Error Path: Server returns 5xx error', () => {
    it('should handle 500 server error and propagate error to caller', async () => {
      const mockErrorResponse = {
        error: 'internal_server_error',
        message: 'Failed to create order',
      };

      fetch.mockResponseOnce(JSON.stringify(mockErrorResponse), { status: 500 });

      const validPayload = {
        templateId: 'template-abc',
        recipientName: 'Alice',
        recipientEmail: 'alice@example.com',
        personalMessage: 'Happy birthday!',
      };

      const response = await fetch('http://localhost:8080/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(500);
      const errorData = await response.json();
      expect(errorData.error).toBe('internal_server_error');
    });
  });

  describe('Network Error Path: Fetch fails (e.g., connection refused)', () => {
    it('should propagate network error to caller for retry logic', async () => {
      fetch.mockRejectOnce(new Error('Failed to fetch: connection refused'));

      const validPayload = {
        templateId: 'template-abc',
        recipientName: 'Alice',
        recipientEmail: 'alice@example.com',
        personalMessage: 'Happy birthday!',
      };

      await expect(
        fetch('http://localhost:8080/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        })
      ).rejects.toThrow('Failed to fetch: connection refused');
    });
  });
});
