import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";

const findings = useMetricAtom("route-entry-directive");

// Demo apps, examples and OG images rendered by Satori aren't shipped UI.
const EXAMPLE_PATH = /(^|\/)(examples?|demos?|playgrounds?|sandbox(es)?)\/|[-_.](demo|example|dummy)s?[-_./]/i;
const OG_IMAGE = /from\s+["'](next\/og|@vercel\/og|satori)["']|new ImageResponse\(/;

// App Router entry files: app/**/page.tsx, layout.tsx, template.tsx (also .jsx/.ts/.js).
const ROUTE_ENTRY = /(^|\/)app\/(.+\/)?(page|layout|template)\.[jt]sx?$/;

const codemod: Codemod<TSX> = async (root, options) => {
  // --param includeExamples=1 keeps example and demo code, which is sometimes copied into apps.
  if (!options.params?.includeExamples && (EXAMPLE_PATH.test(root.filename().replace(/\\/g, "/")) || OG_IMAGE.test(root.root().text()))) return null;
  const report = (node: SgNode<TSX>, dims: Record<string, string>) => {
    findings.increment(dims);
    if (options.params?.locations) {
      console.log(`FINDING\troute-entry-directive\t${root.filename()}:${node.range().start.line + 1}\t${JSON.stringify(dims)}`);
    }
  };

  const entry = root.filename().replace(/\\/g, "/").match(ROUTE_ENTRY)?.[3];
  if (!entry) return null;
  const program = root.root();
  const first = program.children().find((c) => c.isNamed() && c.kind() !== "comment");
  const directive = first?.kind() === "expression_statement" ? first.children().find((c) => c.isNamed())?.text() : "";
  // "use client" pushes the route to the browser; "use server" turns every export,
  // including the page or layout component itself, into a callable server action.
  const name = directive?.replace(/^["']|["']$/g, "");
  if (name === "use client" || name === "use server") report(first!, { entry, directive: name.replace(" ", "-") });
  return null;
};

export default codemod;
