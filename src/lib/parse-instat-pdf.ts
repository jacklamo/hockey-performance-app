// Regex patterns based on hypothetical Instat layout — verify against real PDF and adjust as needed.
import pdfParse from 'pdf-parse';

export interface InstatFields {
  goals?: string;
  assists?: string;
  shots?: string;
  opponent?: string;
  date?: string;
  plusMinus?: string;
  iceTime?: string;
}

export async function parseInstatPdf(buffer: Buffer): Promise<InstatFields> {
  const data = await pdfParse(buffer);
  const text = data.text;
  const fields: InstatFields = {};

  const goalsMatch = text.match(/Goals?\s*[:\-]?\s*(\d+)/i);
  if (goalsMatch) fields.goals = goalsMatch[1];

  const assistsMatch = text.match(/Assists?\s*[:\-]?\s*(\d+)/i);
  if (assistsMatch) fields.assists = assistsMatch[1];

  const shotsMatch = text.match(/Shots?\s*(?:on\s*Goal)?\s*[:\-]?\s*(\d+)/i);
  if (shotsMatch) fields.shots = shotsMatch[1];

  const opponentMatch = text.match(/vs\.?\s+([A-Z][A-Za-z0-9\s\-\.]+?)(?:\s*\n|\s{2,}|$)/m);
  if (opponentMatch) fields.opponent = opponentMatch[1].trim();

  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) fields.date = dateMatch[1];

  const plusMinusMatch = text.match(/[+\-\/]?[-\u2212]?\s*(?:plus[\s\-]?minus|\+\/-)\s*[:\-]?\s*([+\-]?\d+)/i);
  if (plusMinusMatch) fields.plusMinus = plusMinusMatch[1];

  const iceTimeMatch = text.match(/ice\s*time\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (iceTimeMatch) fields.iceTime = iceTimeMatch[1];

  return fields;
}
