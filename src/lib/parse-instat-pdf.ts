import pdfParse from 'pdf-parse';

export interface InstatFields {
  goals?: string;
  assists?: string;
  shots?: string;
  opponent?: string;
  homeAway?: 'home' | 'away';
  date?: string;
  plusMinus?: string;
  iceTime?: string;
}

// Instat uses an em/en dash to represent zero for stats with no value in a game.
function dashToZero(s: string): string {
  return /^[–—]$/.test(s.trim()) ? '0' : s.trim();
}

export async function parseInstatPdf(buffer: Buffer): Promise<InstatFields> {
  const data = await pdfParse(buffer);
  const text = data.text.replace(/\r\n?/g, '\n');
  const fields: InstatFields = {};

  // Value is either a digit string or an em/en dash representing zero.
  const goalsMatch = text.match(/Goals\s*([–—]|\d+)/i);
  if (goalsMatch) fields.goals = dashToZero(goalsMatch[1]);

  const assistsMatch = text.match(/Assists\s*([–—]|\d+)/i);
  if (assistsMatch) fields.assists = dashToZero(assistsMatch[1]);

  // Format in PDF: "Shots / on goal2/1" when non-zero, "Shots / on goal —" when zero
  const shotsMatch = text.match(/Shots\s*\/\s*on\s+goal\s*([–—]|\d+)/i);
  if (shotsMatch) fields.shots = dashToZero(shotsMatch[1]);

  // Date format in PDF: DD.MM.YYYY
  const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (dateMatch) fields.date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

  // Plus/minus can be negative (e.g. -2) or an em dash for zero.
  const plusMinusMatch = text.match(/Plus\s+Minus\s*([–—]|[+\-]?\d+)/i);
  if (plusMinusMatch) fields.plusMinus = dashToZero(plusMinusMatch[1]);

  // Time on ice format in PDF: "06:11 07:53" — first value is game, convert MM:SS → whole minutes
  const iceTimeMatch = text.match(/Time\s+on\s+ice\s*(\d+):(\d+)/i);
  if (iceTimeMatch) {
    const minutes = parseInt(iceTimeMatch[1], 10);
    const seconds = parseInt(iceTimeMatch[2], 10);
    fields.iceTime = String(Math.round((minutes * 60 + seconds) / 60));
  }

  // Game header format: "TEAM_A SCORE:SCORE TEAM_B"
  // First team is home, second is away.
  // The player's team appears as a standalone section header in the TOC.
  const headerMatch = text.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/m);
  if (headerMatch) {
    const homeTeam = headerMatch[1].trim();
    const awayTeam = headerMatch[4].trim();

    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const homeStandalone = new RegExp(`^${escape(homeTeam)}\\s*$`, 'm').test(text);
    const awayStandalone = new RegExp(`^${escape(awayTeam)}\\s*$`, 'm').test(text);

    if (awayStandalone && !homeStandalone) {
      fields.opponent = homeTeam;
      fields.homeAway = 'away';
    } else if (homeStandalone && !awayStandalone) {
      fields.opponent = awayTeam;
      fields.homeAway = 'home';
    }
  }

  return fields;
}
