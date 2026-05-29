import path from "node:path";

const workspacePackageDeepImportPattern = /^@eli-coach-platform\/[^/]+\/.+/u;
const allowedWorkspacePackageDeepImports = new Set(["@eli-coach-platform/ui/styles.css"]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function getImportSource(node) {
  if (!node.source) {
    return null;
  }

  if (typeof node.source.value === "string") {
    return node.source.value;
  }

  return null;
}

function isRelativeImport(source) {
  return source === "." || source === ".." || source.startsWith("./") || source.startsWith("../");
}

function startsWithMultiLevelParent(source) {
  return source.startsWith("../../");
}

function resolveImportPath(filename, source) {
  return normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(filename), source)));
}

function getWorkspaceRelativePath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const workspaceRoot = normalizePath(process.cwd());

  if (path.posix.isAbsolute(normalizedPath)) {
    const relativePath = normalizePath(path.posix.relative(workspaceRoot, normalizedPath));

    if (relativePath !== ".." && !relativePath.startsWith("../")) {
      return relativePath;
    }
  }

  return normalizedPath;
}

function getWorkspacePackageName(filePath) {
  const segments = getWorkspaceRelativePath(filePath).split("/");

  if (segments[0] !== "packages" || !segments[1]) {
    return null;
  }

  return segments[1];
}

function getAppRelativePath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const appRoot = "apps/platform/app/";
  const appRootIndex = normalizedPath.indexOf(appRoot);

  if (appRootIndex === -1) {
    return null;
  }

  return normalizedPath.slice(appRootIndex);
}

function isAppLocalRelativeImport(filename, source) {
  const appRelativePath = getAppRelativePath(filename);

  if (appRelativePath === null) {
    return false;
  }

  return resolveImportPath(appRelativePath, source).startsWith("apps/platform/app/");
}

function isWorkspaceRelativeImport(filename, source) {
  if (!isRelativeImport(source)) {
    return false;
  }

  const importPath = resolveImportPath(normalizePath(filename), source);
  const importPackageName = getWorkspacePackageName(importPath);

  if (importPackageName === null) {
    return false;
  }

  return getWorkspacePackageName(filename) !== importPackageName;
}

function isWorkspacePackageDeepImport(source) {
  return (
    workspacePackageDeepImportPattern.test(source) && !allowedWorkspacePackageDeepImports.has(source)
  );
}

function createSourceVisitor(reportSource) {
  return {
    ExportAllDeclaration: reportSource,
    ExportNamedDeclaration: reportSource,
    ImportDeclaration: reportSource,
    ImportExpression: reportSource,
  };
}

export const platformImportRules = {
  "no-workspace-relative-imports": {
    meta: {
      messages: {
        usePackageBarrel: "Import workspace packages through their public package barrel.",
        usePackageName: "Import workspace packages through their package name.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      return createSourceVisitor((node) => {
        const source = getImportSource(node);

        if (source === null) {
          return;
        }

        if (isWorkspaceRelativeImport(context.filename, source)) {
          context.report({
            messageId: "usePackageName",
            node: node.source,
          });

          return;
        }

        if (isWorkspacePackageDeepImport(source)) {
          context.report({
            messageId: "usePackageBarrel",
            node: node.source,
          });
        }
      });
    },
  },
  "prefer-platform-app-alias": {
    meta: {
      messages: {
        preferAlias: "Use the app root alias for app-local imports that cross multiple directories.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      return createSourceVisitor((node) => {
        const source = getImportSource(node);

        if (source === null || !startsWithMultiLevelParent(source)) {
          return;
        }

        if (!isAppLocalRelativeImport(context.filename, source)) {
          return;
        }

        context.report({
          messageId: "preferAlias",
          node: node.source,
        });
      });
    },
  },
};
