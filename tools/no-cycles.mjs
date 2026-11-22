import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const CONFIG = resolve(import.meta.dirname, "dependency-cruiser.config.cjs");
const PRODUCTION_ROOT = "apps/platform/src";
const IN_BOUNDED_CONTEXT = new RegExp(
  `^${PRODUCTION_ROOT}/bounded-contexts/([^/]+)/(.+)$`,
);
const NOT_COMPONENT_FOLDERS = new Set(["public", "shared"]);

function cruiseProductionModules(cwd) {
  let stdout;
  try {
    stdout = execFileSync(
      "pnpm",
      [
        "--silent",
        "exec",
        "depcruise",
        "--config",
        CONFIG,
        "--output-type",
        "json",
        "--no-cache",
        PRODUCTION_ROOT,
      ],
      { cwd, encoding: "utf8", stdio: "pipe", maxBuffer: 512 * 1024 * 1024 },
    );
  } catch (error) {
    if (!error.stdout) throw error;
    stdout = error.stdout;
  }
  return JSON.parse(stdout).modules;
}

function boundedContextOf(path) {
  return path.match(IN_BOUNDED_CONTEXT)?.[1];
}

// A component is a folder of a bounded context that is neither its public/ nor
// its shared/. The bounded context's own files (public/, shared/,
// composition.server.ts, routes.ts) belong to no component.
function componentOf(path) {
  const match = path.match(IN_BOUNDED_CONTEXT);
  if (!match) return undefined;
  const [, boundedContext, inside] = match;
  const [folder, ...rest] = inside.split("/");
  const isComponentFolder =
    rest.length > 0 && !NOT_COMPONENT_FOLDERS.has(folder);
  return isComponentFolder ? `${boundedContext}/${folder}` : undefined;
}

function dependencyGraph(modules, unitOf) {
  const graph = new Map();
  for (const module of modules) {
    const from = unitOf(module.source);
    if (!from) continue;
    for (const dependency of module.dependencies) {
      const to = unitOf(dependency.resolved);
      if (!to || to === from) continue;
      graph.set(from, (graph.get(from) ?? new Set()).add(to));
    }
  }
  return graph;
}

function cyclesOf(graph) {
  const cycles = [];
  const explored = new Set();

  function explore(unit, trail) {
    const startOfCycle = trail.indexOf(unit);
    if (startOfCycle !== -1) {
      cycles.push([...trail.slice(startOfCycle), unit]);
      return;
    }
    if (explored.has(unit)) return;
    for (const next of [...(graph.get(unit) ?? [])].sort()) {
      explore(next, [...trail, unit]);
    }
    explored.add(unit);
  }

  for (const unit of [...graph.keys()].sort()) {
    explore(unit, []);
  }
  return cycles;
}

function cycleProblems(modules, kind, unitOf) {
  return cyclesOf(dependencyGraph(modules, unitOf)).map(
    (cycle) => `${kind} cycle: ${cycle.join(" -> ")}`,
  );
}

export function auditNoCycles(cwd) {
  const modules = cruiseProductionModules(cwd);
  return [
    ...cycleProblems(modules, "bounded context", boundedContextOf),
    ...cycleProblems(modules, "component", componentOf),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = auditNoCycles(resolve(import.meta.dirname, ".."));
  for (const problem of problems) {
    console.error(problem);
  }
  if (problems.length > 0) {
    process.exitCode = 1;
  }
}
