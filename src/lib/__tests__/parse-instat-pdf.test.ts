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

  test('extracts goals from "Goals1" (no space, real PDF format)', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals1\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '1' }));
  });

  test('extracts goals as "0" when PDF shows em dash (player had no goals)', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Goals — —\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '0' }));
  });

  test('extracts goals when line uses CR-only endings (\\r)', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('some text\rGoals1\r'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '1' }));
  });

  test('extracts assists from "Assists2" (no space, real PDF format)', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Assists2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ assists: '2' }));
  });

  test('extracts assists as "0" when PDF shows em dash', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Assists — —\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ assists: '0' }));
  });

  test('extracts shots from "Shots / on goal2/1" (no space before number)', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Shots / on goal2/1\n50%\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ shots: '2' }));
  });

  test('extracts shots as "0" when PDF shows em dash', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Shots / on goal — 1.3 / 0.7 54%\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ shots: '0' }));
  });

  test('extracts plusMinus as "0" when PDF shows em dash', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Plus Minus — -1\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ plusMinus: '0' }));
  });

  test('extracts negative plusMinus correctly', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('Plus Minus -2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ plusMinus: '-2' }));
  });

  test('extracts opponent and homeAway=home from header when home team appears standalone', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('TEAM_A 2:1 TEAM_B\nTEAM_A\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ opponent: 'TEAM_B', homeAway: 'home' }));
  });

  test('extracts opponent and homeAway=away from header when away team appears standalone', async () => {
    mockPdfParse.mockResolvedValue(makePdfData('TEAM_A 2:1 TEAM_B\nTEAM_B\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ opponent: 'TEAM_A', homeAway: 'away' }));
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
    mockPdfParse.mockResolvedValue(makePdfData('Goals1\nAssists2\n'));
    const result = await parseInstatPdf(Buffer.from(''));
    expect(result).toEqual(expect.objectContaining({ goals: '1', assists: '2' }));
    expect(result).not.toHaveProperty('shots');
  });
});
