import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";

const findings = useMetricAtom("img-missing-alt");

// Demo apps, examples and OG images rendered by Satori aren't shipped UI.
const EXAMPLE_PATH = /(^|\/)(examples?|demos?|playgrounds?|sandbox(es)?)\/|[-_.](demo|example|dummy)s?[-_./]/i;
const OG_IMAGE = /from\s+["'](next\/og|@vercel\/og|satori)["']|new ImageResponse\(/;

const codemod: Codemod<TSX> = async (root, options) => {
  // --param includeExamples=1 keeps example and demo code, which is sometimes copied into apps.
  if (!options.params?.includeExamples && (EXAMPLE_PATH.test(root.filename().replace(/\\/g, "/")) || OG_IMAGE.test(root.root().text()))) return null;
  const report = (node: SgNode<TSX>, dims: Record<string, string>) => {
    findings.increment(dims);
    if (options.params?.locations) {
      console.log(`FINDING\timg-missing-alt\t${root.filename()}:${node.range().start.line + 1}\t${JSON.stringify(dims)}`);
    }
  };

  const program = root.root();
  const importsNextImage = program.has({
    rule: { kind: "import_statement", has: { kind: "string", regex: "^[\"']next/(legacy/)?image[\"']$" } },
  });
  const elementName = importsNextImage ? "^(img|Image)$" : "^img$";

  const images = program.findAll({
    rule: {
      any: [{ kind: "jsx_opening_element" }, { kind: "jsx_self_closing_element" }],
      has: { field: "name", regex: elementName },
    },
  });

  for (const image of images) {
    const direct = { stopBy: "neighbor" as const, kind: image.is("jsx_opening_element") ? ("jsx_opening_element" as const) : ("jsx_self_closing_element" as const) };
    const hasAlt = image.has({ rule: { kind: "jsx_attribute", has: { kind: "property_identifier", regex: "^alt$" }, inside: direct } });
    const hasSpread = image.has({ rule: { kind: "jsx_expression", has: { kind: "spread_element" }, inside: direct } });
    // Hidden or presentational images are skipped by screen readers anyway.
    const hidden = image.has({
      rule: {
        kind: "jsx_attribute",
        inside: direct,
        any: [
          { regex: "^aria-hidden(=(\\{true\\}|\"true\"))?$" },
          { regex: "^role=[\"'](presentation|none)[\"']$" },
        ],
      },
    });
    if (!hasAlt && !hasSpread && !hidden) report(image, { element: image.field("name")?.text() ?? "img" });
  }
  return null;
};

export default codemod;
