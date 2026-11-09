import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";

const findings = useMetricAtom("floating-async-iteration");

// Demo apps, examples and OG images rendered by Satori aren't shipped UI.
const EXAMPLE_PATH = /(^|\/)(examples?|demos?|playgrounds?|sandbox(es)?)\/|[-_.](demo|example|dummy)s?[-_./]/i;
const OG_IMAGE = /from\s+["'](next\/og|@vercel\/og|satori)["']|new ImageResponse\(/;

const isAsyncCallback = (node: SgNode<TSX> | undefined) =>
  !!node && (node.kind() === "arrow_function" || node.kind() === "function_expression" || node.kind() === "function") && /^async\b/.test(node.text());

const codemod: Codemod<TSX> = async (root, options) => {
  // --param includeExamples=1 keeps example and demo code, which is sometimes copied into apps.
  if (!options.params?.includeExamples && (EXAMPLE_PATH.test(root.filename().replace(/\\/g, "/")) || OG_IMAGE.test(root.root().text()))) return null;
  const report = (node: SgNode<TSX>, dims: Record<string, string>) => {
    findings.increment(dims);
    if (options.params?.locations) {
      console.log(`FINDING\tfloating-async-iteration\t${root.filename()}:${node.range().start.line + 1}\t${JSON.stringify(dims)}`);
    }
  };

  const calls = root.root().findAll({
    rule: { kind: "call_expression", has: { field: "function", kind: "member_expression", regex: "\\.(forEach|map)$" } },
  });

  for (const call of calls) {
    const callback = call.field("arguments")?.children().find((c) => c.isNamed());
    if (!isAsyncCallback(callback)) continue;
    const method = call.field("function")?.field("property")?.text();
    if (method === "forEach") {
      report(call, { method: "forEach" });
    } else if (call.parent()?.kind() === "expression_statement") {
      // `items.map(async ...)` as a bare statement: the promises are created and dropped.
      report(call, { method: "map-result-discarded" });
    }
  }
  return null;
};

export default codemod;
