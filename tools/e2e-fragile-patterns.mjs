import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

const HEADING_LEVEL = "selects a heading by level; find it by its name instead";
const FIXED_WAIT =
  "waits a fixed time; wait for what the user sees or the event instead";
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "playwright-report",
  "test-results",
]);

function calleeOf(call) {
  const { expression } = call;
  if (ts.isIdentifier(expression)) return expression;
  if (ts.isPropertyAccessExpression(expression)) return expression.name;
  return undefined;
}

function hasProperty(options, name) {
  return (
    options !== undefined &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.some((property) => property.name?.getText() === name)
  );
}

function selectsHeadingByLevel(call, callee) {
  const [role, options] = call.arguments;

  return (
    callee.text === "getByRole" &&
    role !== undefined &&
    ts.isStringLiteralLike(role) &&
    role.text === "heading" &&
    hasProperty(options, "level")
  );
}

function waitsFixedTime(call, callee) {
  const isGlobalSetTimeout =
    ts.isIdentifier(call.expression) && callee.text === "setTimeout";

  return callee.text === "waitForTimeout" || isGlobalSetTimeout;
}

function problemOf(call, callee) {
  if (selectsHeadingByLevel(call, callee)) return HEADING_LEVEL;
  if (waitsFixedTime(call, callee)) return FIXED_WAIT;
  return undefined;
}

export function auditFragileE2ePatternsInSource(fileName, text) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const problems = [];
  const visit = (node) => {
    const callee = ts.isCallExpression(node) ? calleeOf(node) : undefined;
    const problem = callee && problemOf(node, callee);
    if (problem !== undefined) {
      const { line } = source.getLineAndCharacterOfPosition(callee.getStart());
      problems.push(`${fileName}:${line + 1}: ${problem}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

function typeScriptFilesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !SKIPPED_DIRECTORIES.has(entry.name))
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return typeScriptFilesUnder(path);
      return entry.name.endsWith(".ts") ? [path] : [];
    });
}

export function auditFragileE2ePatterns(directory) {
  return typeScriptFilesUnder(directory)
    .sort()
    .flatMap((path) =>
      auditFragileE2ePatternsInSource(
        relative(directory, path),
        readFileSync(path, "utf8"),
      ),
    );
}
