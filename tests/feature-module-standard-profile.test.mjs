import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";

import {
  checkFeatureModuleProfile,
  PROFILE_DOCUMENT,
  PROFILE_PATH,
  validateFeatureModuleProfile,
} from "../architecture/checks/feature-module-standard-profile.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(join(root, path), "utf8");
const input = {
  profile: JSON.parse(await read(PROFILE_PATH)),
  manifest: JSON.parse(await read("package.json")),
  catalog: JSON.parse(await read("architecture/package-catalog.json")),
  document: await read(PROFILE_DOCUMENT),
  index: await read("docs/README.md"),
  navigation: await read("AGENTS.md"),
  sourcePolicy: parseYaml(await read("architecture/foundation/source-dependencies.yaml")),
  workflow: parseYaml(await read(".github/workflows/ci.yml")),
};

test("checked-in profile binds the real pre-production repository", async () => {
  await checkFeatureModuleProfile(root);
  assert.equal(
    input.profile.standard.sha256,
    "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa",
  );
  assert.equal(input.profile.status, "pre-production");
  assert.equal(input.profile.conformance.structural, "not-claimed");
});

test("rejects authority drift, silent scope changes and false conformance", async (t) => {
  const mutations = [
    [
      "digest",
      (value) => {
        value.profile.standard.sha256 = "a".repeat(64);
      },
      /standard identity/u,
    ],
    [
      "moving revision",
      (value) => {
        value.profile.standard.revision = "main";
      },
      /standard identity/u,
    ],
    [
      "scope",
      (value) => {
        value.profile.scope.productionRoots = [];
      },
      /scope/u,
    ],
    [
      "mapping",
      (value) => {
        value.profile.mapping.featureRoot = "src";
      },
      /mapping/u,
    ],
    [
      "local extensions",
      (value) => {
        value.profile.localExtensions.composition = "dynamic-host";
      },
      /local extensions/u,
    ],
    [
      "deviation",
      (value) => {
        value.profile.deviations = [{ reason: "skip" }];
      },
      /deviations/u,
    ],
    [
      "claim",
      (value) => {
        value.profile.conformance.structural = "passed";
      },
      /conformance/u,
    ],
    [
      "pending evidence",
      (value) => {
        value.profile.pendingProductionEvidence.pop();
      },
      /pending production evidence/u,
    ],
    [
      "unknown field",
      (value) => {
        value.profile.skip = true;
      },
      /profile fields/u,
    ],
    [
      "package",
      (value) => {
        value.catalog.packages.push({ id: "new-package" });
      },
      /pre-production catalog/u,
    ],
  ];
  for (const [name, mutate, expected] of mutations) {
    await t.test(name, () => {
      const value = structuredClone(input);
      mutate(value);
      assert.throws(() => validateFeatureModuleProfile(value), expected);
    });
  }
});

test("rejects removed, no-op and nonblocking enforcement", async (t) => {
  const mutations = [
    [
      "mandatory file removed",
      (value) => {
        value.manifest.scripts["evidence:custody:test"] =
          "agent-teams-node-test --contract architecture/foundation/required-node-tests.json -- tests/architecture-topology.test.mjs";
      },
    ],
    [
      "mandatory runner replaced",
      (value) => {
        value.manifest.scripts["evidence:custody:test"] =
          "node --test tests/evidence-custody.test.mjs";
      },
    ],
    [
      "critical full gate removed",
      (value) => {
        value.manifest.scripts["architecture:check"] = value.manifest.scripts[
          "architecture:check"
        ].replace("pnpm evidence:custody:test && ", "");
      },
    ],
    [
      "critical fast gate removed",
      (value) => {
        value.manifest.scripts["architecture:check:fast"] = value.manifest.scripts[
          "architecture:check:fast"
        ].replace("pnpm evidence:custody:test && ", "");
      },
    ],
    [
      "missing leaf",
      (value) => {
        delete value.manifest.scripts["architecture:feature-module-profile"];
      },
    ],
    [
      "no-op leaf",
      (value) => {
        value.manifest.scripts["architecture:topology:check"] = "node -e ''";
      },
    ],
    [
      "missing full path",
      (value) => {
        value.manifest.scripts.check = "pnpm typecheck";
      },
    ],
    [
      "missing fast path",
      (value) => {
        value.manifest.scripts["check:fast"] = "pnpm typecheck";
      },
    ],
    [
      "hidden as echo",
      (value) => {
        value.manifest.scripts.check = "echo pnpm architecture:check";
      },
    ],
    [
      "swallowed failure",
      (value) => {
        value.manifest.scripts["architecture:check"] += " || true";
      },
    ],
    [
      "profile tests removed",
      (value) => {
        value.manifest.scripts["architecture:check:fast"] = value.manifest.scripts[
          "architecture:check:fast"
        ].replace("pnpm architecture:feature-module-profile:test && ", "");
      },
    ],
    [
      "CI removed",
      (value) => {
        value.workflow.jobs.check.steps = [];
      },
    ],
    [
      "CI skipped",
      (value) => {
        value.workflow.jobs.check.if = false;
      },
    ],
    [
      "CI soft failure",
      (value) => {
        value.workflow.jobs.check["continue-on-error"] = true;
      },
    ],
  ];
  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const value = structuredClone(input);
      mutate(value);
      assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
    });
  }
});

test("rejects unreachable documentation and development boundary drift", async (t) => {
  for (const key of ["document", "index", "navigation"]) {
    await t.test(key, () => {
      const value = structuredClone(input);
      value[key] = "";
      assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
    });
  }
  const value = structuredClone(input);
  value.sourcePolicy.boundaries.find(
    (boundary) => boundary.id === "repository.architecture-checks",
  ).dependencyMode = "runtime";
  assert.throws(() => validateFeatureModuleProfile(value), /governed development entrypoint/u);
});

test("filesystem check fails closed for absent files and ambiguous JSON", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "ext-fo-fms-"));
  try {
    await assert.rejects(checkFeatureModuleProfile(fixture), /ENOENT/u);
    const paths = [
      PROFILE_PATH,
      PROFILE_DOCUMENT,
      "package.json",
      "architecture/package-catalog.json",
      "docs/README.md",
      "AGENTS.md",
      "architecture/foundation/source-dependencies.yaml",
      ".github/workflows/ci.yml",
      ...input.profile.authorities,
    ];
    for (const path of paths) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await writeFile(join(fixture, path), await read(path));
    }
    await checkFeatureModuleProfile(fixture);
    await writeFile(join(fixture, PROFILE_PATH), '{"status":"pre-production","status":"active"}');
    await assert.rejects(checkFeatureModuleProfile(fixture), /DUPLICATE_JSON_KEY/u);
    await writeFile(join(fixture, PROFILE_PATH), await read(PROFILE_PATH));
    await rm(join(fixture, input.profile.authorities[1]));
    await assert.rejects(checkFeatureModuleProfile(fixture), /ENOENT/u);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("dogfooding model budget preserves structural scope and rejects growth", async (t) => {
  const guardPath = "architecture/checks/dogfooding-protocol-model.mjs";
  const guard = await read(guardPath);
  const modelFiles = ["contract", "oracle", "reducer", "test"].map(
    (name) => `tests/qualification/dogfooding-protocol${name === "test" ? ".test" : `-${name}`}.ts`,
  );
  const texts = await Promise.all(modelFiles.map(read));
  const execute = promisify(execFile);
  const fixture = await mkdtemp(join(tmpdir(), "ext-fo-model-budget-"));
  const compact = (text) => text.replace(/^ +/gmu, "").replace("\n", " ");
  try {
    // Resolve the unchanged guard against this repository's already-installed dependencies.
    await symlink(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
    const run = async (mutate, expected) => {
      const sources = [...texts];
      let candidate = guard;
      if (mutate) {
        candidate = mutate(sources, guard) ?? guard;
      }
      for (const [index, path] of [guardPath, ...modelFiles].entries()) {
        await mkdir(dirname(join(fixture, path)), { recursive: true });
        await rm(join(fixture, path), { force: true });
        await writeFile(join(fixture, path), index === 0 ? candidate : sources[index - 1]);
      }
      let result;
      try {
        result = await execute(process.execPath, [join(fixture, guardPath)], { cwd: fixture });
      } catch (error) {
        assert.ok(expected, error.stderr);
        assert.match(error.stderr, expected);
        return error.stderr;
      }
      assert.equal(expected, undefined, `unexpected admission: ${result.stdout}`);
      return JSON.parse(result.stdout);
    };
    await t.test("reviewed formatted model is admitted at the exact fixed ceiling", async () => {
      const actual = await run();
      assert.deepEqual(actual.measurements, {
        structuralNodes: 50546,
        physicalLines: 10520,
        utf8Bytes: 370975,
        charactersPerLine: 116,
      });
      assert.deepEqual(actual.limits, {
        structuralNodes: 50546,
        physicalLines: 10520,
        utf8Bytes: 370975,
        charactersPerLine: 200,
      });
    });
    await t.test("parentheses and transparent control-body braces buy no headroom", async () => {
      const actual = await run((sources) => {
        sources[0] = sources[0]
          .replace("if (!valid(value)) {\n    throw", "if ((!valid(value))) throw")
          .replace("\n  }\n  // The sole", "\n  // The sole");
      });
      assert.equal(actual.measurements.structuralNodes, 50546);
    });
    await t.test("canonical newline measurements remain platform-independent", async () => {
      const actual = await run((sources) => {
        for (let index = 0; index < sources.length; index += 1) {
          sources[index] = sources[index].replaceAll("\n", "\r\n");
        }
      });
      assert.deepEqual(actual.measurements, {
        structuralNodes: 50546,
        physicalLines: 10520,
        utf8Bytes: 370975,
        charactersPerLine: 116,
      });
    });
    const growth = [
      ["executable statement", 6, (text) => `${compact(text)}Math.abs(0);`],
      [
        "lexical block",
        1,
        (text) =>
          compact(text).replace(
            "return value as unknown as Result;",
            "{ return value as unknown as Result; }",
          ),
      ],
      [
        "declaration-bearing body",
        5,
        (text) =>
          compact(text).replace("if (!valid(value)) {", "if (!valid(value)) { const extra = 0;"),
      ],
      [
        "label body",
        3,
        (text) => compact(text).replace("throw new TypeError", "label: throw new TypeError"),
      ],
      ["string expression body", 5, (text) => `${compact(text)}if (true) { "directive"; }`],
      ["empty control block", 3, (text) => `${compact(text)}if (true) {}`],
      ["function block", 3, (text) => `${compact(text)}function extra() {}`],
      ["try and catch blocks", 4, (text) => `${compact(text)}try {} catch {}`],
      [
        "multi-statement control block",
        2,
        (text) => compact(text).replace("if (!valid(value)) {", "if (!valid(value)) { ;"),
      ],
    ];
    for (const [name, delta, mutate] of growth) {
      await t.test(`${name} remains counted despite compressed whitespace`, async () => {
        const failure = await run((sources) => {
          sources[0] = mutate(sources[0]);
        }, /structuralNodes is \d+, limit 50546/u);
        const measurement = JSON.parse(
          failure.match(/MODEL_BUDGET_MEASUREMENTS=(.*)/u)[1],
        ).measurements;
        assert.equal(measurement.structuralNodes, 50546 + delta);
        assert.ok(measurement.physicalLines <= 10520);
        assert.ok(measurement.utf8Bytes <= 370975);
      });
    }
    for (const [name, mutate, expected] of [
      [
        "header comment line",
        (text) => `// retained header\n${text}`,
        /physicalLines is 10521, limit 10520/u,
      ],
      ["one UTF-8 byte", (text) => text.replace("\n", " \n"), /utf8Bytes is 370976, limit 370975/u],
      [
        "201-code-point line",
        (text) => `//${"x".repeat(199)}\n${compact(text)}`,
        /charactersPerLine is 201, limit 200/u,
      ],
      ["unclean TypeScript", (text) => `const = ;\n${text}`, /cannot be parsed/u],
      [
        "external import",
        (text) => `import "not-admitted";\n${text}`,
        /unsupported external dependency/u,
      ],
      [
        "dynamic import",
        (text) => `${text}import("node:test");`,
        /unsupported dynamic module loading/u,
      ],
      [
        "process loading",
        (text) => `${text}process.getBuiltinModule("fs");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "CommonJS loading",
        (text) => `${text}require("fs");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "reflective loading",
        (text) => `${text}Reflect.get({}, "loader");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "changed closure edge",
        (text) => `import "./dogfooding-protocol-reducer.ts";\n${text}`,
        /independent model dependency graph/u,
      ],
      [
        "source outside roster",
        (text) => `import "./extra.ts";\n${text}`,
        /outside the closed model/u,
      ],
    ]) {
      await t.test(name, async () => {
        await writeFile(join(fixture, "tests/qualification/extra.ts"), "export {};\n");
        await run((sources) => {
          sources[0] = mutate(sources[0]);
        }, expected);
      });
    }
    for (const [name, mutate, expected] of [
      [
        "metric version",
        (source) => source.replace("version: 1", "version: 2"),
        /unsupported dogfooding structural metric or parser version/u,
      ],
      [
        "parser version",
        (source) => source.replace('parserVersion: "0.146.0"', 'parserVersion: "0.0.0"'),
        /unsupported dogfooding structural metric or parser version/u,
      ],
      [
        "fifth roster entry",
        (source) =>
          source.replace(
            "const modelFiles = [",
            'const modelFiles = ["tests/qualification/extra.ts",',
          ),
        /four distinct files/u,
      ],
      [
        "missing source",
        (source) =>
          source.replace(
            '"tests/qualification/dogfooding-protocol-contract.ts",',
            '"tests/qualification/missing.ts",',
          ),
        /ENOENT/u,
      ],
    ]) {
      await t.test(name, async () => {
        await run((_sources, source) => mutate(source), expected);
      });
    }
    await t.test("symlink model input refuses", async () => {
      await run();
      await rm(join(fixture, modelFiles[0]));
      await symlink(join(root, modelFiles[0]), join(fixture, modelFiles[0]));
      await assert.rejects(
        execute(process.execPath, [join(fixture, guardPath)], { cwd: fixture }),
        (error) => /must be a non-symlink regular file/u.test(error.stderr),
      );
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
