import { validateGoalieStats } from '@/src/lib/goalie';

interface Props {
  shotsAgainst: string;
  goalsAgainst: string;
  iceTime: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

const input = (err?: string) =>
  `w-full px-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black placeholder:text-gray-600 outline-none transition-colors ${
    err ? 'border-red-500' : 'border-gray-300'
  }`;

export default function GoalieStatsFields({ shotsAgainst, goalsAgainst, iceTime, onChange, errors, disabled }: Props) {
  const sa = shotsAgainst === '' ? NaN : Number(shotsAgainst);
  const ga = goalsAgainst === '' ? NaN : Number(goalsAgainst);
  const saves = Number.isInteger(sa) && Number.isInteger(ga) && ga <= sa ? String(sa - ga) : '—';

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">Your Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="shotsAgainst" className="block text-sm font-bold text-black mb-1">Shots Against</label>
          <input type="number" id="shotsAgainst" name="shotsAgainst" value={shotsAgainst} onChange={onChange}
            placeholder="0" min="0" step="1" className={input(errors.shotsAgainst)} disabled={disabled} />
          {errors.shotsAgainst && <p className="mt-1 text-sm text-red-600">{errors.shotsAgainst}</p>}
        </div>
        <div>
          <label htmlFor="goalsAgainst" className="block text-sm font-bold text-black mb-1">Goals Against</label>
          <input type="number" id="goalsAgainst" name="goalsAgainst" value={goalsAgainst} onChange={onChange}
            placeholder="0" min="0" step="1" className={input(errors.goalsAgainst)} disabled={disabled} />
          {errors.goalsAgainst && <p className="mt-1 text-sm text-red-600">{errors.goalsAgainst}</p>}
        </div>
        <div>
          <p className="block text-sm font-bold text-black mb-1">Saves (SA - GA)</p>
          <p className="px-4 py-3 text-lg text-gray-900 bg-gray-50 border border-gray-200 rounded-lg" aria-live="polite">{saves}</p>
        </div>
        <div>
          <label htmlFor="iceTime" className="block text-sm font-bold text-black mb-1">Minutes Played</label>
          <input type="number" id="iceTime" name="iceTime" value={iceTime} onChange={onChange}
            placeholder="0" min="0" className={input(errors.iceTime)} disabled={disabled} />
          {errors.iceTime && <p className="mt-1 text-sm text-red-600">{errors.iceTime}</p>}
        </div>
      </div>
    </div>
  );
}

// Raw-string validation: blank is an error (not 0). Returns field-keyed errors.
export function goalieFieldErrors(sa: string, ga: string): Record<string, string> {
  const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
  const r = validateGoalieStats(num(sa), num(ga));
  if (!('error' in r)) return {};
  return { [r.error.startsWith('Shots') ? 'shotsAgainst' : 'goalsAgainst']: r.error };
}
