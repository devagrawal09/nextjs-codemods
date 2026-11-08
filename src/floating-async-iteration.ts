__PRELUDE__

const isAsyncCallback = (node: SgNode<TSX> | undefined) =>
  !!node && (node.kind() === "arrow_function" || node.kind() === "function_expression" || node.kind() === "function") && /^async\b/.test(node.text());

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

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
