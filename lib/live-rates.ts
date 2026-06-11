/**
 * Pacing math for the live engagement simulation.
 * A tweet's "heat" is its average like velocity (likes / age), damped as it ages —
 * fresh tweets keep most of their velocity, day-old tweets are essentially still.
 */

/** Parse a simulated relative-time string ("3m", "47m", "2h", "8h", "1d") into minutes. */
export function parseAgoMinutes(ago: string): number {
  const m = /^(\d+)\s*([smhd])$/.exec(ago.trim());
  if (!m) return 24 * 60; // unparseable => treat as old and quiet
  const n = Number(m[1]);
  switch (m[2]) {
    case "s":
      return n / 60;
    case "m":
      return n;
    case "h":
      return n * 60;
    default:
      return n * 1440;
  }
}

/**
 * Expected likes gained per second, right now.
 * Historical velocity (likes / age, with a 5-minute floor so brand-new tweets
 * don't go infinite) times an age-decay factor: engagement falls off hard
 * after the first hours and is near-zero past a day.
 */
export function likesPerSecond(likes: number, ageMinutes: number): number {
  const ageSeconds = Math.max(ageMinutes, 5) * 60;
  const ageHours = ageMinutes / 60;
  const decay = ageHours <= 2 ? 1 : ageHours <= 8 ? 0.6 : ageHours <= 24 ? 0.25 : 0.02;
  return (likes / ageSeconds) * decay;
}

/**
 * Draw a non-negative integer with the given expected value:
 * jitter the mean, take the floor, and roll the fractional remainder.
 * Quiet tweets (expected << 1) thus stay at 0 most ticks and occasionally bump by 1.
 */
export function sampleIncrement(expected: number, rand: () => number): number {
  if (expected <= 0) return 0;
  const jittered = expected * (0.6 + rand() * 1.2);
  const whole = Math.floor(jittered);
  const frac = jittered - whole;
  return whole + (rand() < frac ? 1 : 0);
}
