// Every random choice the cats make goes through a Random, so a run can be repeated: in VS Code
// it draws from Math.random, in the tests from a seeded generator. Each method draws exactly
// one number.

export class Random {
  /** `source` returns a number in [0, 1), like Math.random. */
  constructor(private readonly source: () => number = () => Math.random()) {}

  next(): number {
    return this.source();
  }

  /** A number between a and b. */
  between(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** One element of the list, each equally likely. */
  oneOf<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  /** One of the options, each as likely as its weight. */
  pick<T>(options: readonly (readonly [T, number])[]): T {
    let r = this.next() * options.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, w] of options) {
      if ((r -= w) < 0) return value;
    }
    return options[0][0];
  }
}
