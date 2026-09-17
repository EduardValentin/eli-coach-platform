import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export function auditDomainLayout(root) {
  const problems = [];
  for (const folder of readdirSync(root).filter((name) =>
    statSync(join(root, name)).isDirectory(),
  )) {
    const files = readdirSync(join(root, folder));
    if (folder !== "shared") {
      if (!files.includes("index.ts"))
        problems.push(`${folder}: missing index.ts`);
      if (!files.includes(`${folder}.ts`))
        problems.push(`${folder}: missing ${folder}.ts`);
    }
    for (const file of files) {
      if (file.endsWith("-service.ts"))
        problems.push(`${folder}/${file}: service file name`);
      const source = readFileSync(join(root, folder, file), "utf8");
      if (
        /export\s+(?:class|interface|type|const|function)\s+\w+Service\b/.test(
          source,
        )
      )
        problems.push(`${folder}/${file}: exports a *Service`);
      if (file.endsWith("-use-case.ts")) {
        const classes = source.match(/export\s+class\s+\w+UseCase\b/g) ?? [];
        if (classes.length !== 1)
          problems.push(
            `${folder}/${file}: expected one *UseCase class, found ${classes.length}`,
          );
        if (!/^\s+(?:async\s+)?execute\(/m.test(source))
          problems.push(`${folder}/${file}: no execute method`);
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(import.meta.dirname, "..", "packages/domain/src");
  const problems = auditDomainLayout(root);
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length > 0) {
    process.exitCode = 1;
  }
}
