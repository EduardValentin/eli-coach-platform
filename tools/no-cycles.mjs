import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const CONFIG = resolve(import.meta.dirname, "dependency-cruiser.config.cjs");
const PRODUCTION_ROOT = "apps/platform/src";
const IN_BOUNDED_CONTEXT = new RegExp(
  `^${PRODUCTION_ROOT}/bounded-contexts/([^/]+)/(.+)$`,
);
const BOUNDED_CONTEXT_OWN_FOLDERS = new Set(["public", "shared"]);
const BOUNDED_CONTEXT_PUBLIC = new RegExp(
  `^${PRODUCTION_ROOT}/bounded-contexts/[^/]+/public/`,
);
const FACADE_ADAPTER = /\/adapters\/inbound\/facades\//;

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

function componentOf(path) {
  const match = path.match(IN_BOUNDED_CONTEXT);
  if (!match) return undefined;
  const [, boundedContext, inside] = match;
  const [folder, ...rest] = inside.split("/");
  const atBoundedContextRoot = rest.length === 0;
  const belongsToNoComponent =
    atBoundedContextRoot || BOUNDED_CONTEXT_OWN_FOLDERS.has(folder);
  return belongsToNoComponent ? undefined : `${boundedContext}/${folder}`;
}

function addDependency(graph, from, to) {
  if (from === to) return;
  graph.set(from, (graph.get(from) ?? new Set()).add(to));
}

function boundedContextGraph(modules) {
  const graph = new Map();
  for (const module of modules) {
    const from = boundedContextOf(module.source);
    if (!from) continue;
    for (const dependency of module.dependencies) {
      const to = boundedContextOf(dependency.resolved);
      if (to) addDependency(graph, from, to);
    }
  }
  return graph;
}

// A component provides a file of a bounded context's public/ when one of its
// facade adapters imports it.
function facadeProviders(modules) {
  const providers = new Map();
  for (const module of modules) {
    const provider = componentOf(module.source);
    if (!provider || !FACADE_ADAPTER.test(module.source)) continue;
    for (const { resolved } of module.dependencies) {
      if (!BOUNDED_CONTEXT_PUBLIC.test(resolved)) continue;
      providers.set(
        resolved,
        (providers.get(resolved) ?? new Set()).add(provider),
      );
    }
  }
  return providers;
}

// A component depends on the components it imports and on the components that
// provide the facades it calls, which it reaches with no import between them.
function componentGraph(modules) {
  const providers = facadeProviders(modules);
  const graph = new Map();
  for (const module of modules) {
    const from = componentOf(module.source);
    if (!from) continue;
    const implementsFacades = FACADE_ADAPTER.test(module.source);
    for (const { resolved } of module.dependencies) {
      const imported = componentOf(resolved);
      if (imported) addDependency(graph, from, imported);
      if (implementsFacades) continue;
      for (const provider of providers.get(resolved) ?? []) {
        addDependency(graph, from, provider);
      }
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

function cycleProblems(kind, graph) {
  return cyclesOf(graph).map((cycle) => `${kind} cycle: ${cycle.join(" -> ")}`);
}

export function auditNoCycles(cwd) {
  const modules = cruiseProductionModules(cwd);
  return [
    ...cycleProblems("bounded context", boundedContextGraph(modules)),
    ...cycleProblems("component", componentGraph(modules)),
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
