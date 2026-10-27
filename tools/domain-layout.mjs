import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function entriesOf(directory, isWanted) {
  return readdirSync(directory).filter((name) =>
    isWanted(statSync(join(directory, name))),
  );
}

function foldersOf(directory) {
  return entriesOf(directory, (entry) => entry.isDirectory());
}

function filesOf(directory) {
  return entriesOf(directory, (entry) => entry.isFile());
}

function componentDomainsOf(boundedContextsRoot) {
  return foldersOf(boundedContextsRoot).flatMap((boundedContext) =>
    foldersOf(join(boundedContextsRoot, boundedContext))
      .map((component) =>
        join(boundedContextsRoot, boundedContext, component, "domain"),
      )
      .filter((domainRoot) => existsSync(domainRoot)),
  );
}

function auditFile(path, label) {
  const problems = [];
  const source = readFileSync(path, "utf8");
  if (label.endsWith("-service.ts"))
    problems.push(`${label}: service file name`);
  if (
    /export\s+(?:class|interface|type|const|function)\s+\w+Service\b/.test(
      source,
    )
  )
    problems.push(`${label}: exports a *Service`);
  if (label.endsWith("-use-case.ts")) {
    const classes = source.match(/export\s+class\s+\w+UseCase\b/g) ?? [];
    if (classes.length !== 1)
      problems.push(
        `${label}: expected one *UseCase class, found ${classes.length}`,
      );
    if (
      !/^\s+(?:public\s+|private\s+|protected\s+)?(?:async\s+)?execute\(/m.test(
        source,
      )
    )
      problems.push(`${label}: no execute method`);
  }
  return problems;
}

function auditFilesIn(directory, labelPrefix) {
  return filesOf(directory).flatMap((file) =>
    auditFile(join(directory, file), `${labelPrefix}${file}`),
  );
}

function auditConcept(domainRoot, concept) {
  const directory = join(domainRoot, concept);
  const files = filesOf(directory);
  const problems = [];
  if (!files.includes("index.ts"))
    problems.push(`${concept}: missing index.ts`);
  if (!files.includes(`${concept}.ts`))
    problems.push(`${concept}: missing ${concept}.ts`);
  return [...problems, ...auditFilesIn(directory, `${concept}/`)];
}

function auditDomain(domainRoot) {
  return [
    ...foldersOf(domainRoot).flatMap((concept) =>
      auditConcept(domainRoot, concept),
    ),
    ...auditFilesIn(domainRoot, ""),
  ];
}

export function auditDomainLayout(boundedContextsRoot) {
  return componentDomainsOf(boundedContextsRoot).flatMap((domainRoot) => {
    const domainPath = relative(boundedContextsRoot, domainRoot);
    return auditDomain(domainRoot).map((problem) => `${domainPath}/${problem}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(
    import.meta.dirname,
    "..",
    "apps/platform/src/bounded-contexts",
  );
  const problems = auditDomainLayout(root);
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length > 0) {
    process.exitCode = 1;
  }
}
