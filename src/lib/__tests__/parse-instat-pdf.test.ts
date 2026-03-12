jest.mock('pdf-parse', () => jest.fn());
import pdfParse from 'pdf-parse';
import { parseInstatPdf } from '@/src/lib/parse-instat-pdf';

const mockPdfParse = pdfParse as jest.Mock;

const makePdfData = (text: string) => ({
  text,
  numpages: 1,
  numrender: 1,
  info: {},
  metadata: {},
  version: '1.10.100',
});

describe('parseInstatPdf', () => {
  beforeEach(() => {
    mockPdfParse.mockReset();
  });

  test('extracts goals from text containing "Goals: 2"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals: 2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '2' }));
  });

  test('extracts assists from text containing "Assists: 1"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Assists: 1\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ assists: '1' }));
  });

  test('extracts shots from text containing "Shots: 5"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Shots: 5\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ shots: '5' }));
  });

  test('extracts opponent from text containing "vs. Team Name\\n"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('vs. Team Name\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ opponent: 'Team Name' }));
  });

  test('extracts date from text containing "2024-03-15"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('2024-03-15\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ date: '2024-03-15' }));
  });

  test('returns empty object when text has no recognizable fields', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('No stats here.\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual({});
  });

  test('partial extraction: goals and assists present, shots absent', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals: 1\nAssists: 2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '1', assists: '2' }));
    expect(result).not.toHaveProperty('shots');
  });
});
