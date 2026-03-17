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

  test('extracts goals from text containing "Goals 2"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals 2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '2' }));
  });

  test('extracts assists from text containing "Assists 1"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Assists 1\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ assists: '1' }));
  });

  test('extracts shots from text containing "Shots / on goal 5 / 3"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Shots / on goal 5 / 3 50%\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ shots: '5' }));
  });

  test('extracts opponent and homeAway=home from header when home team appears standalone', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('TEAM_A 2:1 TEAM_B\nTEAM_A\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ opponent: 'TEAM_B', homeAway: 'home' }));
  });

  test('extracts date from text containing "15.03.2024"', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('15.03.2024\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ date: '2024-03-15' }));
  });

  test('returns empty object when text has no recognizable fields', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('No stats here.\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual({});
  });

  test('partial extraction: goals and assists present, shots absent', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals 1\nAssists 2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '1', assists: '2' }));
    expect(result).not.toHaveProperty('shots');
  });

  test('extracts opponent and homeAway=away from header when away team appears standalone', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('TEAM_A 2:1 TEAM_B\nTEAM_B\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ opponent: 'TEAM_A', homeAway: 'away' }));
  });
});
