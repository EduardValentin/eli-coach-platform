import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

const JOURNEY_TAGS = ["@critical", "@completeness"];
const TEST_DECLARATIONS = new Set([
  "test",
  "test.only",
  "test.skip",
  "test.fixme",
]);
const GROUP_DECLARATIONS = new Set([
  "test.describe",
  "test.describe.serial",
  "test.describe.parallel",
]);

function calleeNameOf(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const owner = calleeNameOf(expression.expression);
    return owner === undefined ? undefined : `${owner}.${expression.name.text}`;
  }
  return undefined;
}

function isTitle(node) {
  return ts.isStringLiteralLike(node) || ts.isTemplateExpression(node);
}

function isFunction(node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

function tagsIn(options) {
  if (options === undefined || !ts.isObjectLiteralExpression(options))
    return [];
  const property = options.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) && candidate.name.getText() === "tag",
  );
  if (property === undefined) return [];
  const value = property.initializer;
  if (ts.isArrayLiteralExpression(value))
    return value.elements.map((element) => element.getText());
  return [value.getText()];
}

function describeTags(tags) {
  const quoted = tags.map((tag) => tag.replace(/^["'`]|["'`]$/g, ""));
  if (quoted.length === 0) return "has no tag";
  if (quoted.length > 1)
    return `has ${quoted.length} tags (${quoted.join(", ")})`;
  if (!JOURNEY_TAGS.includes(quoted[0]))
    return `has tag ${quoted[0]}, not one of ${JOURNEY_TAGS.join(" or ")}`;
  return undefined;
}

export function auditJourneyTagsInSource(fileName, text) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const problems = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = calleeNameOf(node.expression);
      const [title, second] = node.arguments;
      const line =
        source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (GROUP_DECLARATIONS.has(callee) && tagsIn(second).length > 0) {
        problems.push(
          `${fileName}:${line}: ${callee} carries a tag; tag each test instead`,
        );
      }
      if (
        TEST_DECLARATIONS.has(callee) &&
        title !== undefined &&
        isTitle(title) &&
        isFunction(node.arguments[node.arguments.length - 1])
      ) {
        const problem = describeTags(tagsIn(second));
        if (problem !== undefined)
          problems.push(
            `${fileName}:${line}: test ${title.getText()} ${problem}`,
          );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

export function auditJourneyTags(directory) {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".spec.ts"))
    .sort()
    .flatMap((name) =>
      auditJourneyTagsInSource(
        name,
        readFileSync(join(directory, name), "utf8"),
      ),
    );
}
