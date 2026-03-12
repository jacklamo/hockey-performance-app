import { NextRequest } from 'next/server';
// Import will fail until implementation exists — that is expected (RED)
import { POST } from '../route';

// Mock auth so validation tests don't require a real session
jest.mock('@/src/lib/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
}));

// Mock parseInstatPdf so route tests don't call real pdf-parse
jest.mock('@/src/lib/parse-instat-pdf', () => ({
  parseInstatPdf: jest.fn().mockResolvedValue({ goals: '2' }),
}));

describe('POST /api/games/parse-pdf', () => {
  test('returns 400 when no file is attached', async () => {
    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/games/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'No file provided.' });
  });

  test('returns 400 when a non-PDF file is attached', async () => {
    const formData = new FormData();
    const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    formData.append('pdf', textFile);

    const request = new NextRequest('http://localhost/api/games/parse-pdf', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Please upload a PDF file.' });
  });

  test.todo('returns 401 when unauthenticated');
});
