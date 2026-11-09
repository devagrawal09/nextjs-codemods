__PRELUDE__
__RESOLVE__

// Sanitizers, "safe" HTML helpers, and the `.replace(/</g, "\\u003c")` JSON-in-script escape.
const SANITIZER = /sanitiz|purif|xss|escape|safe|\\u003c|\\x3c|&lt;/i;
// What a hand-written escaper does: replace `<` with an entity or a unicode escape.
const ESCAPES_HTML = /\\u003c|\\x3c|&lt;|&#0?60;|\[[^\]\n]*<[^\]\n]*\]/;

// `serializeJsonLd(data)`: the helper escapes `<` in its body or in the constants it uses, here or in its module.
const withConstants = (source: string, definition: string | null) =>
  [definition ?? "", ...(definition?.match(/\b[A-Z][A-Z0-9_]{2,}\b/g) ?? []).map((c) => definitionIn(source, c) ?? "")].join("\n");

const helperEscapes = (program: SgNode<TSX>, file: string, call: SgNode<TSX>) => {
  const callee = call.field("function");
  if (callee?.kind() !== "identifier") return false;
  const local = definitionIn(program.text(), callee.text());
  if (local) return ESCAPES_HTML.test(withConstants(program.text(), local));
  const imported = importOf(program, callee.text());
  const module = imported && resolveImport(file, imported.spec);
  return !!module && ESCAPES_HTML.test(withConstants(module.source, definitionIn(module.source, imported.name)));
};

// Shiki escapes the code it highlights: `__html: html` where html, or its setter, is filled from codeToHtml.
const fromShiki = (program: SgNode<TSX>, html: SgNode<TSX>) => {
  const name = html.text().match(/^[\w$]+/)?.[0];
  if (!name) return false;
  const filled = new RegExp(`\\b(${name}|set${name.charAt(0).toUpperCase()}${name.slice(1)})\\b`);
  return program
    .findAll({ rule: { kind: "call_expression", has: { field: "function", regex: "codeTo(Html|Hast)$" } } })
    .some((call) => filled.test(call.ancestors().find((a) => /(statement|declaration)$/.test(a.kind()))?.text() ?? ""));
};

const MARKDOWN = /marked|markdown|remark|rehype|md|mdx|highlight|shiki|codeToHtml|toHtml|render/i;

const classify = (value: SgNode<TSX>) => {
  if (value.kind() === "call_expression") {
    const callee = value.field("function")?.text() ?? "";
    if (callee === "JSON.stringify") return "json-stringify";
    return MARKDOWN.test(callee) ? "rendered-markup" : "function-result";
  }
  if (value.kind() === "template_string") return "template";
  return value.kind() === "identifier" || value.kind() === "member_expression" ? "variable" : "expression";
};

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  const program = root.root();
  const attributes = program.findAll({
    rule: { kind: "jsx_attribute", has: { kind: "property_identifier", regex: "^dangerouslySetInnerHTML$" } },
  });

  for (const attribute of attributes) {
    // <style> injection is limited to CSS; script and markup sinks are the XSS risk.
    if (attribute.parent()?.field("name")?.text() === "style") continue;
    const html = attribute.find({
      rule: { kind: "pair", has: { field: "key", regex: "^__html$" } },
    })?.field("value");
    if (!html) continue;
    if (html.kind() === "string") continue;
    if (html.kind() === "template_string" && !html.has({ rule: { kind: "template_substitution" } })) continue;
    if (SANITIZER.test(html.text())) continue;
    if (fromShiki(program, html)) continue;
    if (html.kind() === "call_expression" && helperEscapes(program, root.filename(), html)) continue;
    // `const clean = DOMPurify.sanitize(raw)` earlier in the file counts as sanitized.
    if (html.kind() === "identifier") {
      const declaration = root.root().find({
        rule: { kind: "variable_declarator", has: { field: "name", regex: `^${html.text()}$` } },
      });
      if (declaration && SANITIZER.test(declaration.field("value")?.text() ?? "")) continue;
    }
    report(attribute, { source: classify(html) });
  }
  return null;
};

export default codemod;
