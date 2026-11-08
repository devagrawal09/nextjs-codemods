__PRELUDE__

const SUPPRESSIONS: [string, RegExp][] = [
  ["eslint", /eslint-disable(-next-line|-line)?\b.*react-hooks\/exhaustive-deps/],
  ["biome", /biome-ignore\b.*useExhaustiveDependencies/],
  ["oxlint", /oxlint-disable(-next-line|-line)?\b.*exhaustive-deps/],
];

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  for (const comment of root.root().findAll({ rule: { kind: "comment" } })) {
    const tool = SUPPRESSIONS.find(([, re]) => re.test(comment.text()))?.[0];
    // `-- reason` (eslint/oxlint) or `: reason` (biome) records why the deps were left out.
    const justified = /(exhaustive-deps|useExhaustiveDependencies)\s*(--|:)\s*\S/.test(comment.text());
    if (tool) report(comment, { tool, justified: justified ? "yes" : "no" });
  }
  return null;
};

export default codemod;
