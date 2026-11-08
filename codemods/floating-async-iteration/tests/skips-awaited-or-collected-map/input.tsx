export async function restoreImages(sources: string[], restore: (src: string) => Promise<void>) {
  // not reported: awaited together
  await Promise.all(sources.map(async (src) => restore(src)));
  // not reported: the promises are kept
  const pending = sources.map(async (src) => restore(src));
  // reported: the one control case in this fixture
  sources.map(async (src) => restore(src));
  return pending;
}
