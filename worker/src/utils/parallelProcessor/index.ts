
export async function parallelProcessor<T, R>(
  items: T[],
  processFn: (item: T, index: number) => Promise<R>,
  concurrency: number = 3,
): Promise<R[]> {
  if (concurrency <= 0) {
    throw new Error("Concurrency must be a positive number");
  }

  const queue = [...items];
  const results: R[] = new Array(items.length);
  const activePromises: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    if (queue.length === 0) return;

    const index = items.length - queue.length;
    const item = queue.shift()!;

    results[index] = await processFn(item, index);

    return processNext();
  };

  const initialBatchSize = Math.min(concurrency, items.length);
  for (let i = 0; i < initialBatchSize; i++) {
    activePromises.push(processNext());
  }

  await Promise.all(activePromises);

  return results;
}
