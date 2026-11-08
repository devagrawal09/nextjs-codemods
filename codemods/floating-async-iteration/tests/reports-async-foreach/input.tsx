export async function restoreImages(sources: string[], restore: (src: string) => Promise<void>) {
  // reported: forEach ignores the promises, so the caller resumes before any image is restored
  sources.forEach(async (src) => {
    await restore(src);
  });
}
