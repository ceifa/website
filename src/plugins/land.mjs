import { defineHastPlugin } from "satteri";

// Marks the surfaces the resident can stand on: every line of text and every
// code block. See `measure()` in src/scripts/inhabit.mjs.
const blocks = new Set(["p", "ul", "ol", "pre", "blockquote", "div", "details"]);
const isInline = (node) =>
  node.type === "text" ||
  (node.type === "element" && !blocks.has(node.tagName));

function wrapInline(children) {
  const result = [];
  let run = [];
  const flush = () => {
    if (run.some((child) => child.type !== "text" || child.value.trim()))
      result.push({
        type: "element",
        tagName: "span",
        properties: { dataLand: "text" },
        children: run,
      });
    else result.push(...run);
    run = [];
  };
  for (const child of children) {
    if (isInline(child)) run.push(child);
    else {
      flush();
      result.push(child);
    }
  }
  flush();
  return result;
}

export default defineHastPlugin({
  name: "land",
  element: {
    filter: ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "pre"],
    visit(node, ctx) {
      if (node.tagName === "pre") ctx.setProperty(node, "dataLand", "top");
      else ctx.setField(node, "children", wrapInline(node.children));
    },
  },
});
