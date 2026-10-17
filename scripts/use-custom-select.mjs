// One-time codemod: swaps every native <select> in src/ for the custom <Select>
// (src/components/ui/Select.tsx) and adds the import. Safe to run twice.
// Run from the project root:  node scripts/use-custom-select.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const IMPORT = 'import { Select } from "@/components/ui/Select";';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

let changed = 0;
for (const file of walk(root)) {
  if (!file.endsWith(".tsx") || file.endsWith(path.join("ui", "Select.tsx"))) continue;
  let text = fs.readFileSync(file, "utf8");
  if (!/<select[\s>]/.test(text)) continue;

  text = text.replace(/<select(?=[\s>])/g, "<Select").replace(/<\/select>/g, "</Select>");

  if (!text.includes(IMPORT)) {
    const re = /^import[\s\S]*?;[ \t]*$/gm;
    let last = null;
    let m;
    while ((m = re.exec(text))) last = m;
    if (last) {
      const at = last.index + last[0].length;
      text = text.slice(0, at) + "\n" + IMPORT + text.slice(at);
    } else {
      text = text.replace(/^(["']use client["'];?)/, `$1\n${IMPORT}`);
    }
  }
  fs.writeFileSync(file, text);
  changed++;
  console.log("updated", path.relative(process.cwd(), file));
}
console.log(`Done. ${changed} file(s) updated.`);