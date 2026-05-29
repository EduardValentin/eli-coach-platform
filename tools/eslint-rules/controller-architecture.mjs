import path from "node:path";

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function getAppRelativePath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const appRoot = "apps/platform/app/";
  const appRootIndex = normalizedPath.indexOf(appRoot);

  if (appRootIndex === -1) {
    return normalizedPath;
  }

  return normalizedPath.slice(appRootIndex);
}

function isTestFile(filename) {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path.posix.basename(normalizePath(filename)));
}

function isRouteFile(filename) {
  return getAppRelativePath(filename).startsWith("apps/platform/app/routes/");
}

function isRootFile(filename) {
  return getAppRelativePath(filename) === "apps/platform/app/root.tsx";
}

function isApiRouteFile(filename) {
  const appRelativePath = getAppRelativePath(filename);

  if (!appRelativePath.startsWith("apps/platform/app/routes/")) {
    return false;
  }

  const basename = path.posix.basename(appRelativePath);

  return basename.startsWith("api.") || appRelativePath.startsWith("apps/platform/app/routes/internal/");
}

function isControllerFile(filename) {
  return /controller\.server\.[cm]?[jt]sx?$/u.test(path.posix.basename(normalizePath(filename)));
}

function classNameEndsWithController(node) {
  const className = getClassName(node);

  return className !== null && className.endsWith("Controller");
}

function getClassName(node) {
  if (node.id?.name) {
    return node.id.name;
  }

  const parent = node.parent;

  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") {
    return parent.id.name;
  }

  if (
    parent?.type === "AssignmentExpression" &&
    parent.left.type === "Identifier" &&
    parent.operator === "="
  ) {
    return parent.left.name;
  }

  return null;
}

function isConstructorMethod(node) {
  return node.kind === "constructor";
}

function isThisPropertyAssignment(node) {
  return (
    node.left.type === "MemberExpression" &&
    node.left.object.type === "ThisExpression" &&
    !node.left.computed
  );
}

function isControllerModuleSource(source) {
  return /^~\/modules\/.+controller\.server$/u.test(source);
}

function isTypeOnlyImport(node) {
  if (node.importKind === "type") {
    return true;
  }

  return (
    node.specifiers.length > 0 &&
    node.specifiers.every((specifier) => specifier.importKind === "type")
  );
}

function importsGetPlatformContainer(node) {
  if (node.importKind === "type") {
    return false;
  }

  return node.specifiers.some((specifier) => {
    if (specifier.importKind === "type") {
      return false;
    }

    return (
      specifier.type === "ImportNamespaceSpecifier" ||
      (specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier" &&
        specifier.imported.name === "getPlatformContainer")
    );
  });
}

function isControllerConstructorCall(node) {
  return node.callee.type === "Identifier" && node.callee.name.endsWith("Controller");
}

export const controllerArchitectureRules = {
  "api-routes-use-container-controllers": {
    meta: {
      messages: {
        useContainerController: "API routes should use controllers from getPlatformContainer().",
        useContainerControllerImport:
          "API routes should not value-import controllers directly from app modules.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      if (!isApiRouteFile(context.filename)) {
        return {};
      }

      return {
        ImportDeclaration(node) {
          const source = typeof node.source.value === "string" ? node.source.value : null;

          if (
            source !== null &&
            isControllerModuleSource(source) &&
            !isTypeOnlyImport(node)
          ) {
            context.report({
              messageId: "useContainerControllerImport",
              node: node.source,
            });
          }
        },
        ImportExpression(node) {
          const source = node.source;

          if (source.type !== "Literal" || typeof source.value !== "string") {
            return;
          }

          if (isControllerModuleSource(source.value)) {
            context.report({
              messageId: "useContainerControllerImport",
              node: source,
            });
          }
        },
        NewExpression(node) {
          if (isControllerConstructorCall(node)) {
            context.report({
              messageId: "useContainerController",
              node: node.callee,
            });
          }
        },
      };
    },
  },
  "no-controller-inheritance": {
    meta: {
      messages: {
        noControllerInheritance: "Controllers should use composition instead of inheritance.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      function checkClass(node) {
        if (node.superClass && classNameEndsWithController(node)) {
          context.report({
            messageId: "noControllerInheritance",
            node: node.id ?? node,
          });
        }
      }

      return {
        ClassDeclaration: checkClass,
        ClassExpression: checkClass,
      };
    },
  },
  "no-controller-instance-state": {
    meta: {
      messages: {
        noInstanceAssignment: "Request state must stay in method scope, not on controller instances.",
        noInstanceField: "Controllers should not declare instance fields outside constructor dependencies.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      if (!isControllerFile(context.filename)) {
        return {};
      }

      const controllerClassStack = [];
      const methodStack = [];

      function isInControllerClass() {
        return controllerClassStack.at(-1) === true;
      }

      return {
        "ClassDeclaration, ClassExpression"(node) {
          controllerClassStack.push(classNameEndsWithController(node));
        },
        "ClassDeclaration:exit"() {
          controllerClassStack.pop();
        },
        "ClassExpression:exit"() {
          controllerClassStack.pop();
        },
        "MethodDefinition, PropertyDefinition[method=true]"(node) {
          methodStack.push(node);
        },
        "MethodDefinition:exit"() {
          methodStack.pop();
        },
        "PropertyDefinition[method=true]:exit"() {
          methodStack.pop();
        },
        PropertyDefinition(node) {
          if (node.method || node.static || !isInControllerClass()) {
            return;
          }

          context.report({
            messageId: "noInstanceField",
            node,
          });
        },
        AssignmentExpression(node) {
          if (!isInControllerClass() || !isThisPropertyAssignment(node)) {
            return;
          }

          const currentMethod = methodStack.at(-1);

          if (currentMethod && isConstructorMethod(currentMethod)) {
            return;
          }

          context.report({
            messageId: "noInstanceAssignment",
            node: node.left,
          });
        },
      };
    },
  },
  "no-global-container-outside-routes": {
    meta: {
      messages: {
        noGlobalContainer:
          "getPlatformContainer is limited to route, root, and test app-boundary contexts.",
      },
      schema: [],
      type: "problem",
    },
    create(context) {
      if (isRouteFile(context.filename) || isRootFile(context.filename) || isTestFile(context.filename)) {
        return {};
      }

      return {
        ImportDeclaration(node) {
          if (node.source.value !== "~/server/container.server") {
            return;
          }

          if (!importsGetPlatformContainer(node)) {
            return;
          }

          context.report({
            messageId: "noGlobalContainer",
            node: node.source,
          });
        },
        ImportExpression(node) {
          const source = node.source;

          if (source.type !== "Literal" || source.value !== "~/server/container.server") {
            return;
          }

          context.report({
            messageId: "noGlobalContainer",
            node: source,
          });
        },
      };
    },
  },
};
