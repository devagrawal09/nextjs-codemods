__PRELUDE__

// Per-item loops only: while/do loops here are almost always deliberate pagination.
const LOOP_KINDS = new Set(["for_statement", "for_in_statement"]);
const LOOP_OR_FUNCTION = new Set([...LOOP_KINDS, "while_statement", "do_statement"]);
// Seeds, one-off scripts and data migrations run once, off the request path.
const OFFLINE_PATH = /(^|\/)(seeds?|scripts?|migrations?|commands?|upgrade[\w-]*|backfills?)(\/|\.)|(^|\/)seed[\w-]*\.[jt]sx?$/i;
// `for (i = 0; i < n; i += CHUNK)` and `for (const batch of chunk(rows, 100))` are batching, not one query per item.
const CHUNK_SOURCE = /chunk|batch|page/i;
const isChunkedLoop = (loop: SgNode<TSX>) => {
  if (loop.kind() === "for_statement") {
    const step = loop.field("increment")?.text() ?? "";
    return step !== "" && !/^\w+\s*(\+\+|\+=\s*1)$|^\+\+\w+$/.test(step);
  }
  return CHUNK_SOURCE.test(loop.field("right")?.text() ?? "") || CHUNK_SOURCE.test(loop.field("left")?.text() ?? "");
};
const FUNCTION_KINDS = new Set(["arrow_function", "function_expression", "function", "function_declaration", "method_definition"]);

const ORMS: [string, RegExp][] = [
  ["prisma", /^(this\.)?(ctx\.)?(prisma|prismaClient|tx)\??\.\w+\??\.(find|create|update|upsert|delete|count|aggregate|groupBy)\w*\(/],
  ["drizzle-or-sql", /^(this\.)?(ctx\.)?(db|tx|trx|database)\??\.(select|insert|update|delete|query|execute|selectFrom|insertInto|deleteFrom|updateTable)\b/],
  ["supabase", /^(this\.)?supabase\??\.(from|rpc)\(/],
  ["repository", /^(this\.)?\w*[rR]epository\??\.(find|findOne|findBy|findOneBy|save|insert|update|delete|count|query|upsert)\w*\(/],
];

const codemod: Codemod<TSX> = async (root, options) => {
__REPORT__

  if (OFFLINE_PATH.test(root.filename().replace(/\\/g, "/"))) return null;

  for (const awaited of root.root().findAll({ rule: { kind: "await_expression" } })) {
    const query = awaited.children().find((c) => c.isNamed());
    const orm = ORMS.find(([, re]) => re.test(query?.text() ?? ""))?.[0];
    if (!orm) continue;
    // The nearest enclosing loop must be inside the same function as the await.
    const scope = awaited.ancestors().find((a) => LOOP_OR_FUNCTION.has(a.kind()) || FUNCTION_KINDS.has(a.kind()));
    if (scope && LOOP_KINDS.has(scope.kind()) && !isChunkedLoop(scope)) report(awaited, { orm });
  }
  return null;
};

export default codemod;
