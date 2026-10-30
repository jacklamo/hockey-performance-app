import Link from 'next/link';
import DemoButton from '@/app/components/DemoButton';
import RinkChart from '@/app/components/RinkChart';
import { buildDemoGames } from '@/src/lib/demo';
import { buildConfidenceGroups } from '@/src/lib/chart-utils';

const STEPS = [
  { title: 'Log the game', body: 'Goals, assists, shots and ice time. Or import your Instat PDF and skip the typing.' },
  { title: 'Rate how you felt', body: 'Four taps and your hours of sleep. It takes about 90 seconds.' },
  { title: 'Read the pattern', body: 'See how confidence and sleep line up with your scoring, and how we worked it out.' },
];

export default function Home() {
  // The hero chart shows the same sample season the demo account uses.
  const sample = buildDemoGames().flatMap((g) =>
    g.mentalState
      ? [{
          date: g.date.toISOString(),
          opponent: g.opponent,
          goals: g.goals,
          assists: g.assists,
          mentalState: { ...g.mentalState, notes: g.mentalState.notes ?? undefined },
        }]
      : []
  );
  const zones = buildConfidenceGroups(
    sample.map((g, i) => ({ id: String(i), homeAway: '', result: '', shots: 0, plusMinus: 0, iceTime: 0, ...g }))
  );
  const points = sample.map((g) => ({
    confidence: g.mentalState.confidence,
    points: g.goals + g.assists,
    label: `${g.date.slice(0, 10)} vs ${g.opponent}: confidence ${g.mentalState.confidence}, ${g.goals + g.assists} points`,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-(--dasher) text-(--dasher-fg) rounded-b-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-serif font-bold text-xl sm:text-2xl mr-auto">Hockey Performance Tracker</span>
          <nav className="flex items-center gap-5 text-[15px]" aria-label="Account">
            <Link href="/auth/login" className="opacity-80 hover:opacity-100">Log in</Link>
            <Link href="/auth/signup" className="opacity-80 hover:opacity-100">Create account</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col gap-16">
        <section className="grid grid-cols-1 gap-8 md:grid-cols-[7fr_4fr] md:gap-12 md:items-end">
          <h1 className="text-[clamp(46px,8vw,100px)] font-bold leading-[0.98] tracking-[-0.02em] text-gray-900 text-balance">
            Your best games have something in common.
          </h1>
          <div>
            <p className="mb-5 max-w-[32ch] text-xl text-gray-700">
              Log each game, then log how you felt going in. After a few weeks your own results show which nights you play your best.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <DemoButton className="rounded-lg border-2 border-blue-600 bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 hover:border-blue-700 disabled:opacity-50" />
              <Link href="/auth/signup" className="px-2 font-semibold text-gray-900 underline underline-offset-4">
                Create an account
              </Link>
            </div>
          </div>
        </section>

        <figure className="m-0">
          <RinkChart points={points} zones={zones} />
          <figcaption className="mt-3 max-w-[70ch] text-gray-500">
            Sample season. Each puck is one game. The further right, the more confident you felt going in. The higher up, the more points you scored.
          </figcaption>
        </figure>

        <section className="grid grid-cols-1 border-t-[3px] border-gray-900 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`pt-5 pb-2 md:pr-6 ${i > 0 ? 'mt-5 border-t border-gray-200 pt-5 md:mt-0 md:border-t-0 md:border-l md:pl-6' : ''}`}
            >
              <h2 className="mb-2 text-3xl font-bold text-gray-900">{step.title}</h2>
              <p className="max-w-[32ch] text-gray-600">{step.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
