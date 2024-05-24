
export async function nConcurrentRequests<I extends string, Res>(
  inputs: I[],
  n: number,
  fn: (input: I) => Promise<Res>,
) {
  const results = {} as Record<I, Res>;
  let i = 0;

  await Promise.all(new Array(n).fill(null).map(async () => {
    while (i < inputs.length) {
      const key = inputs[i];
      i++;
      results[key] = await fn(key);
    }
  }));

  return results;
}
