
export async function nConcurrentRequests<I extends string, Res>(
    inputs: I[],
    n: number,
    fn: (input: I) => Promise<Res>
) {
    const results: Record<I, Res> = {} as any;
    let i = 0;

    await Promise.all(new Array(n).fill(null).map(async () => {
        while (i < inputs.length) {
            const key = inputs[i];
            i++;
            results[key] = await fn(key);
        }
    }));

    
    return results
}
