const TESTS = "\\.(test|integration\\.test)\\.[cm]?[jt]sx?$";

module.exports = {
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: [TESTS] },
    tsPreCompilationDeps: "specify",
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"],
    },
  },
};
