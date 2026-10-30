import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function entriesOf(directory, isWanted) {
  return readdirSync(directory)
    .filter((name) => isWanted(statSync(join(directory, name))))
    .sort();
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

function serviceNameProblems(source, label) {
  const problems = [];
  if (label.endsWith("-service.ts"))
    problems.push(`${label}: service file name`);
  if (
    /export\s+(?:class|interface|type|const|function)\s+\w+Service\b/.test(
      source,
    )
  )
    problems.push(`${label}: exports a *Service`);
  return problems;
}

function useCaseShapeProblems(source, label) {
  if (!label.endsWith("-use-case.ts")) return [];
  const problems = [];
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
  return problems;
}

function auditFile(path, label) {
  const source = readFileSync(path, "utf8");
  return [
    ...serviceNameProblems(source, label),
    ...useCaseShapeProblems(source, label),
  ];
}

function auditFilesIn(directory, labelPrefix) {
  return filesOf(directory).flatMap((file) =>
    auditFile(join(directory, file), `${labelPrefix}${file}`),
  );
}

function entityFilesOf(concept) {
  return concept.endsWith("s")
    ? [`${concept}.ts`, `${concept.slice(0, -1)}.ts`]
    : [`${concept}.ts`];
}

function auditConcept(domainRoot, concept) {
  const directory = join(domainRoot, concept);
  const files = filesOf(directory);
  const problems = [];
  if (!files.includes("index.ts"))
    problems.push(`${concept}: missing index.ts`);
  if (!entityFilesOf(concept).some((entity) => files.includes(entity)))
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

const UNIT_FILES = [
  { suffix: "-facade-adapter", unit: "FacadeAdapter", kinds: ["class"] },
  {
    prefix: "create-",
    suffix: "-adapter",
    unit: "Adapter",
    kinds: ["function"],
  },
  { suffix: "-adapter", unit: "Adapter", kinds: ["class"] },
  { suffix: "-repository", unit: "Repository", kinds: ["class"] },
  { suffix: "-facade", unit: "Facade", kinds: ["interface"] },
  { suffix: "-port", unit: "Port", kinds: ["interface", "type"] },
];

const NAMED_UNIT = /(Port|Repository|Adapter|Facade)$/;

function kebabOf(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function exportedDeclarationsOf(source) {
  const patterns = [
    ["class", /export\s+(?:abstract\s+)?class\s+(\w+)/g],
    ["interface", /export\s+interface\s+(\w+)/g],
    ["type", /export\s+type\s+(\w+)\s*(?:<[^=]*>)?\s*=/g],
    ["function", /export\s+(?:async\s+)?function\s+(\w+)/g],
  ];
  return patterns.flatMap(([kind, pattern]) =>
    [...source.matchAll(pattern)].map((match) => ({ kind, name: match[1] })),
  );
}

function sourceFilesOf(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return sourceFilesOf(path);
    if (
      !/\.tsx?$/.test(name) ||
      /\.test\.tsx?$/.test(name) ||
      name.endsWith(".d.ts")
    )
      return [];
    return [path];
  });
}

function unitFileProblems(stem, declarations, label) {
  const rule = UNIT_FILES.find(
    (candidate) =>
      stem.endsWith(candidate.suffix) &&
      (!candidate.prefix || stem.startsWith(candidate.prefix)),
  );
  if (!rule) return [];
  const units = declarations.filter(
    (declaration) =>
      rule.kinds.includes(declaration.kind) &&
      declaration.name.endsWith(rule.unit),
  );
  if (units.length !== 1)
    return [
      `${label}: expected one exported *${rule.unit}, found ${units.length}`,
    ];
  return kebabOf(units[0].name) === stem
    ? []
    : [`${label}: exports ${units[0].name}, which names another file`];
}

function misplacedUnitProblems(stem, declarations, label) {
  return declarations
    .filter(
      (declaration) =>
        ["class", "interface"].includes(declaration.kind) &&
        NAMED_UNIT.test(declaration.name) &&
        kebabOf(declaration.name) !== stem,
    )
    .map(
      (declaration) =>
        `${label}: ${declaration.name} belongs in ${kebabOf(declaration.name)}.ts`,
    );
}

export function auditUnitNames(sourceRoot) {
  return sourceFilesOf(sourceRoot).flatMap((path) => {
    const label = relative(sourceRoot, path);
    const stem = label
      .split("/")
      .pop()
      .replace(/(\.server)?\.tsx?$/, "");
    const declarations = exportedDeclarationsOf(readFileSync(path, "utf8"));
    return [
      ...unitFileProblems(stem, declarations, label),
      ...misplacedUnitProblems(stem, declarations, label),
    ];
  });
}

const SHARED_FORBIDDEN_FOLDERS = ["domain", "adapters"];

export function auditSharedLayout(sharedRoot) {
  return foldersOf(sharedRoot).flatMap((folder) => {
    const path = join(sharedRoot, folder);
    const nested = auditSharedLayout(path).map(
      (problem) => `${folder}/${problem}`,
    );
    return SHARED_FORBIDDEN_FOLDERS.includes(folder)
      ? [`${folder}: shared holds no ${folder}/ folder`, ...nested]
      : nested;
  });
}

export function auditDomainLayout(boundedContextsRoot) {
  return componentDomainsOf(boundedContextsRoot).flatMap((domainRoot) => {
    const domainPath = relative(boundedContextsRoot, domainRoot);
    return auditDomain(domainRoot).map((problem) => `${domainPath}/${problem}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sourceRoot = resolve(import.meta.dirname, "..", "apps/platform/src");
  const problems = [
    ...auditDomainLayout(join(sourceRoot, "bounded-contexts")),
    ...auditSharedLayout(join(sourceRoot, "shared")).map(
      (problem) => `shared/${problem}`,
    ),
    ...auditUnitNames(sourceRoot),
  ];
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length > 0) {
    process.exitCode = 1;
  }
}
