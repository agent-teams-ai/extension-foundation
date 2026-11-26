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
} from "../architecture/checks/feature-module-standard-profile.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFile(join(root, path), "utf8");
type Input = Parameters<typeof validateFeatureModuleProfile>[0];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const object = (value: unknown): Record<string, unknown> => {
  assert.ok(isObject(value));
  return value;
};
function at(value: unknown, ...path: readonly string[]): unknown {
  for (const field of path) value = object(value)[field];
  return value;
}
const objectAt = (value: unknown, ...path: readonly string[]): Record<string, unknown> => object(at(value, ...path));
const arrayAt = (value: unknown, ...path: readonly string[]): unknown[] => {
  const result = at(value, ...path);
  assert.ok(Array.isArray(result));
  return result;
};
const stringAt = (value: unknown, ...path: readonly string[]): string => {
  const result = at(value, ...path);
  assert.equal(typeof result, "string");
  if (typeof result !== "string") assert.fail("expected string");
  return result;
};
const textAt = (values: readonly string[], index: number): string => {
  const value = values.at(index);
  assert.notEqual(value, undefined);
  if (value === undefined) assert.fail("fixture source is absent");
  return value;
};
const input: Input = {
  profile: JSON.parse(await read(PROFILE_PATH)),
  manifest: JSON.parse(await read("package.json")),
  catalog: JSON.parse(await read("architecture/package-catalog.json")),
  document: await read(PROFILE_DOCUMENT),
  index: await read("docs/README.md"),
  navigation: await read("AGENTS.md"),
  sourcePolicy: parseYaml(await read("architecture/foundation/source-dependencies.yaml")),
  workflow: parseYaml(await read(".github/workflows/ci.yml")),
};

test("checked-in profile binds only the two provisional package roles", async () => {
  await checkFeatureModuleProfile(root);
  assert.equal(at(input, "profile", "standard", "sha256"), "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa");
  assert.equal(at(input, "profile", "status"), "provisional-packages");
  assert.equal(at(input, "profile", "conformance", "structural"), "scoped");
  assert.equal(at(input, "profile", "conformance", "runtime"), "not-claimed");
});

test("rejects authority drift, silent scope changes and false conformance", async context => {
  const mutations: readonly (readonly [string, (value: Input) => void, RegExp])[] = [
    ["digest", value => { objectAt(value, "profile", "standard").sha256 = "a".repeat(64); }, /standard identity/u],
    ["moving revision", value => { objectAt(value, "profile", "standard").revision = "main"; }, /standard identity/u],
    ["scope", value => { objectAt(value, "profile", "scope").productionRoots = []; }, /scope/u],
    ["mapping", value => { objectAt(value, "profile", "mapping").featureRoot = "src"; }, /mapping/u],
    ["local extensions", value => { objectAt(value, "profile", "localExtensions").composition = "dynamic-host"; }, /local extensions/u],
    ["deviation", value => { objectAt(value, "profile").deviations = [{ reason: "skip" }]; }, /deviations/u],
    ["claim", value => { objectAt(value, "profile", "conformance").structural = "passed"; }, /conformance/u],
    ["runtime claim", value => { objectAt(value, "profile", "conformance").runtime = "passed"; }, /conformance/u],
    ["evidence obligation", value => { arrayAt(value, "profile", "productionEvidence", "obligations").pop(); }, /production evidence/u],
    ["evidence package", value => { arrayAt(value, "profile", "productionEvidence", "packages").pop(); }, /production evidence/u],
    ["unknown field", value => { objectAt(value, "profile").skip = true; }, /profile fields/u],
    ["unowned package", value => { arrayAt(value, "catalog", "packages").push({ id: "new-package" }); }, /owned package catalog/u],
    ["role substitution", value => { object(arrayAt(value, "catalog", "packages").at(0)).role = "integration-adapter"; }, /owned package catalog/u],
  ];
  for (const [name, mutate, expected] of mutations) await context.test(name, () => {
    const value = structuredClone(input); mutate(value);
    assert.throws(() => validateFeatureModuleProfile(value), expected);
  });
});

test("rejects removed, no-op and nonblocking enforcement", async context => {
  const script = (value: Input, key: string, command: string): void => { objectAt(value, "manifest", "scripts")[key] = command; };
  const drop = (value: Input, key: string, command: string): void => script(value, key, stringAt(value, "manifest", "scripts", key).split(" && ").filter(item => item !== `pnpm ${command}`).join(" && "));
  const mutations: readonly (readonly [string, (value: Input) => void])[] = [
    ["mandatory file removed", value => script(value, "evidence:custody:test", "agent-teams-node-test --contract architecture/foundation/required-node-tests.json -- tests/architecture-topology.test.mjs")],
    ["mandatory runner replaced", value => script(value, "evidence:custody:test", "node --test tests/evidence-custody.test.mjs")],
    ["production source campaign removed", value => drop(value, "architecture:check", "architecture:package-source:test")],
    ["production source campaign replaced", value => script(value, "architecture:package-source:test", "node -e ''")],
    ["critical full gate removed", value => drop(value, "architecture:check", "evidence:custody:test")],
    ["critical fast gate removed", value => drop(value, "architecture:check:fast", "evidence:custody:test")],
    ["missing leaf", value => { delete objectAt(value, "manifest", "scripts")["architecture:feature-module-profile"]; }],
    ["no-op leaf", value => script(value, "architecture:topology:check", "node -e ''")],
    ["missing full path", value => script(value, "check", "pnpm typecheck")],
    ["missing fast path", value => script(value, "check:fast", "pnpm typecheck")],
    ["hidden as echo", value => script(value, "check", "echo pnpm architecture:check")],
    ["swallowed failure", value => script(value, "architecture:check", stringAt(value, "manifest", "scripts", "architecture:check") + " || true")],
    ["profile tests removed", value => drop(value, "architecture:check:fast", "architecture:feature-module-profile:test")],
    ["CI removed", value => { objectAt(value, "workflow", "jobs", "check").steps = []; }],
    ["CI skipped", value => { objectAt(value, "workflow", "jobs", "check").if = false; }],
    ["CI soft failure", value => { objectAt(value, "workflow", "jobs", "check")["continue-on-error"] = true; }],
  ];
  for (const [name, mutate] of mutations) await context.test(name, () => {
    const value = structuredClone(input); mutate(value);
    assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
  });
});

test("rejects unreachable documentation and development boundary drift", async context => {
  for (const key of ["document", "index", "navigation"] as const) await context.test(key, () => {
    const value = { ...structuredClone(input), [key]: "" };
    assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
  });
  const value = structuredClone(input);
  const boundary = arrayAt(value, "sourcePolicy", "boundaries").map(object).find(candidate => candidate.id === "repository.architecture-checks");
  assert.ok(boundary);
  boundary.dependencyMode = "runtime";
  assert.throws(() => validateFeatureModuleProfile(value), /governed development entrypoint/u);
});

test("production scope cannot lose coverage or invert either pure policy", async context => {
  for (const id of ["package.extension.core.feature.contributions", "package.extension.node-artifact.feature.verified-artifact.kernel"]) {
    await context.test(id, () => {
      const value = structuredClone(input);
      const boundary = arrayAt(value, "sourcePolicy", "boundaries").map(object).find(candidate => candidate.id === id);
      assert.ok(boundary);
      object(boundary.allow).builtins = ["node:fs"];
      assert.throws(() => validateFeatureModuleProfile(value), /pure policy dependencies/u);
    });
  }
  for (const field of ["governedRoots", "packageRoots"]) await context.test(field, () => {
    const value = structuredClone(input);
    objectAt(value, "sourcePolicy")[field] = [];
    assert.throws(() => validateFeatureModuleProfile(value), /remain (?:governed|a classified package)/u);
  });
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
      ...arrayAt(input, "profile", "authorities").map(value => { assert.equal(typeof value, "string"); return String(value); }),
    ];
    for (const path of paths) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await writeFile(join(fixture, path), await read(path));
    }
    await checkFeatureModuleProfile(fixture);
    await writeFile(join(fixture, PROFILE_PATH), '{"status":"pre-production","status":"active"}');
    await assert.rejects(checkFeatureModuleProfile(fixture), /DUPLICATE_JSON_KEY/u);
    await writeFile(join(fixture, PROFILE_PATH), await read(PROFILE_PATH));
    await rm(join(fixture, String(arrayAt(input, "profile", "authorities").at(1))));
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
  const compact = (text: string) => text.replace(/^ +/gmu, "").replace("\n", " ");
  try {
    // Resolve the unchanged guard against this repository's already-installed dependencies.
    await symlink(join(root, "node_modules"), join(fixture, "node_modules"), "dir");
    type Measurements = { structuralNodes: number; physicalLines: number; utf8Bytes: number; charactersPerLine: number };
    type Report = { measurements: Measurements; limits: Measurements };
    type Mutate = (sources: string[], guard: string) => string | void;
    const measurements = (value: unknown): Measurements => {
      const data = object(value);
      const number = (key: string): number => {
        const item = data[key];
        assert.equal(typeof item, "number");
        if (typeof item !== "number") assert.fail("non-numeric measurement");
        return item;
      };
      return { structuralNodes: number("structuralNodes"), physicalLines: number("physicalLines"), utf8Bytes: number("utf8Bytes"), charactersPerLine: number("charactersPerLine") };
    };
    const parseReport = (text: string): Report => {
      const data = object(JSON.parse(text));
      return { measurements: measurements(data.measurements), limits: measurements(data.limits) };
    };
    const failureMeasurements = (failure: string): Measurements => {
      const text = failure.match(/MODEL_BUDGET_MEASUREMENTS=(.*)/u)?.[1];
      assert.ok(text);
      return measurements(object(JSON.parse(text)).measurements);
    };
    function run(mutate?: Mutate, expected?: undefined, checkoutSources?: readonly string[]): Promise<Report>;
    function run(mutate: Mutate | undefined, expected: RegExp, checkoutSources?: readonly string[]): Promise<string>;
    async function run(mutate?: Mutate, expected?: RegExp, checkoutSources: readonly string[] = texts): Promise<Report | string> {
      const sources = checkoutSources.map(text => text.replace(/\r\n?/gu, "\n"));
      const candidate = mutate?.(sources, guard) ?? guard;
      for (const [index, path] of [guardPath, ...modelFiles].entries()) {
        await mkdir(dirname(join(fixture, path)), { recursive: true });
        await rm(join(fixture, path), { force: true });
        await writeFile(join(fixture, path), index === 0 ? candidate : textAt(sources, index - 1));
      }
      let result;
      try {
        result = await execute(process.execPath, [join(fixture, guardPath)], { cwd: fixture });
      } catch (error) {
        assert.ok(error instanceof Error && "stderr" in error && typeof error.stderr === "string");
        assert.ok(expected, error.stderr);
        assert.match(error.stderr, expected);
        return error.stderr;
      }
      assert.equal(expected, undefined, `unexpected admission: ${result.stdout}`);
      return parseReport(result.stdout);
    }
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
        sources[0] = textAt(sources, 0)
          .replace("if (!valid(value)) {\n    throw", "if ((!valid(value))) throw")
          .replace("\n  }\n  // The sole", "\n  // The sole");
      });
      assert.equal(actual.measurements.structuralNodes, 50546);
    });
    await t.test("canonical newline measurements remain platform-independent", async () => {
      const actual = await run((sources) => {
        for (let index = 0; index < sources.length; index += 1) {
          sources[index] = textAt(sources, index).replaceAll("\n", "\r\n");
        }
      });
      assert.deepEqual(actual.measurements, {
        structuralNodes: 50546,
        physicalLines: 10520,
        utf8Bytes: 370975,
        charactersPerLine: 116,
      });
    });
    const crlfCheckout = texts.map((text: string) => text.replace(/\r?\n/gu, "\r\n"));
    await t.test("CRLF checkout does not double the newline fixture", async () => {
      const actual = await run(
        (sources) => {
          for (let index = 0; index < sources.length; index += 1) {
            sources[index] = textAt(sources, index).replaceAll("\n", "\r\n");
          }
        },
        undefined,
        crlfCheckout,
      );
      assert.equal(actual.measurements.physicalLines, 10520);
      assert.equal(actual.measurements.utf8Bytes, 370975);
    });
    for (const [name, mutate, expected] of [
      ["UTF-8 byte", (text: string) => text.replace("\n", " \n"), /utf8Bytes is 370976, limit 370975/u],
      [
        "line width",
        (text: string) => `//${"x".repeat(199)}\n${compact(text)}`,
        /charactersPerLine is 201, limit 200/u,
      ],
      [
        "structural growth",
        (text: string) => `${compact(text)}Math.abs(0);`,
        /structuralNodes is 50552, limit 50546/u,
      ],
    ] satisfies readonly (readonly [string, (text: string) => string, RegExp])[]) {
      await t.test(`CRLF checkout isolates the ${name} budget`, async () => {
        const failure = await run(
          (sources) => {
            sources[0] = mutate(textAt(sources, 0));
          },
          expected,
          crlfCheckout,
        );
        const measurement = failureMeasurements(failure);
        assert.ok(measurement.physicalLines <= 10520);
      });
    }
    const growth: readonly (readonly [string, number, (text: string) => string])[] = [
      ["executable statement", 6, (text: string) => `${compact(text)}Math.abs(0);`],
      [
        "lexical block",
        1,
        (text: string) =>
          compact(text).replace(
            "return value as unknown as Result;",
            "{ return value as unknown as Result; }",
          ),
      ],
      [
        "declaration-bearing body",
        5,
        (text: string) =>
          compact(text).replace("if (!valid(value)) {", "if (!valid(value)) { const extra = 0;"),
      ],
      [
        "label body",
        3,
        (text: string) => compact(text).replace("throw new TypeError", "label: throw new TypeError"),
      ],
      ["string expression body", 5, (text: string) => `${compact(text)}if (true) { "directive"; }`],
      ["empty control block", 3, (text: string) => `${compact(text)}if (true) {}`],
      ["function block", 3, (text: string) => `${compact(text)}function extra() {}`],
      ["try and catch blocks", 4, (text: string) => `${compact(text)}try {} catch {}`],
      [
        "multi-statement control block",
        2,
        (text: string) => compact(text).replace("if (!valid(value)) {", "if (!valid(value)) { ;"),
      ],
    ];
    for (const [name, delta, mutate] of growth) {
      await t.test(`${name} remains counted despite compressed whitespace`, async () => {
        const failure = await run((sources) => {
          sources[0] = mutate(textAt(sources, 0));
        }, /structuralNodes is \d+, limit 50546/u);
        const measurement = failureMeasurements(failure);
        assert.equal(measurement.structuralNodes, 50546 + delta);
        assert.ok(measurement.physicalLines <= 10520);
        assert.ok(measurement.utf8Bytes <= 370975);
      });
    }
    for (const [name, mutate, expected] of [
      [
        "header comment line",
        (text: string) => `// retained header\n${text}`,
        /physicalLines is 10521, limit 10520/u,
      ],
      ["one UTF-8 byte", (text: string) => text.replace("\n", " \n"), /utf8Bytes is 370976, limit 370975/u],
      [
        "201-code-point line",
        (text: string) => `//${"x".repeat(199)}\n${compact(text)}`,
        /charactersPerLine is 201, limit 200/u,
      ],
      ["unclean TypeScript", (text: string) => `const = ;\n${text}`, /cannot be parsed/u],
      [
        "external import",
        (text: string) => `import "not-admitted";\n${text}`,
        /unsupported external dependency/u,
      ],
      [
        "dynamic import",
        (text: string) => `${text}import("node:test");`,
        /unsupported dynamic module loading/u,
      ],
      [
        "process loading",
        (text: string) => `${text}process.getBuiltinModule("fs");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "CommonJS loading",
        (text: string) => `${text}require("fs");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "reflective loading",
        (text: string) => `${text}Reflect.get({}, "loader");`,
        /forbidden runtime loader primitive/u,
      ],
      [
        "changed closure edge",
        (text: string) => `import "./dogfooding-protocol-reducer.ts";\n${text}`,
        /independent model dependency graph/u,
      ],
      [
        "source outside roster",
        (text: string) => `import "./extra.ts";\n${text}`,
        /outside the closed model/u,
      ],
    ] satisfies readonly (readonly [string, (text: string) => string, RegExp])[]) {
      await t.test(name, async () => {
        await writeFile(join(fixture, "tests/qualification/extra.ts"), "export {};\n");
        await run((sources) => {
          sources[0] = mutate(textAt(sources, 0));
        }, expected);
      });
    }
    for (const [name, mutate, expected] of [
      [
        "metric version",
        (source: string) => source.replace("version: 1", "version: 2"),
        /unsupported dogfooding structural metric or parser version/u,
      ],
      [
        "parser version",
        (source: string) => source.replace('parserVersion: "0.146.0"', 'parserVersion: "0.0.0"'),
        /unsupported dogfooding structural metric or parser version/u,
      ],
      [
        "fifth roster entry",
        (source: string) =>
          source.replace(
            "const modelFiles = [",
            'const modelFiles = ["tests/qualification/extra.ts",',
          ),
        /four distinct files/u,
      ],
      [
        "missing source",
        (source: string) =>
          source.replace(
            '"tests/qualification/dogfooding-protocol-contract.ts",',
            '"tests/qualification/missing.ts",',
          ),
        /ENOENT/u,
      ],
    ] satisfies readonly (readonly [string, (text: string) => string, RegExp])[]) {
      await t.test(name, async () => {
        await run((_sources, source) => mutate(source), expected);
      });
    }
    await t.test("symlink model input refuses", async () => {
      await run();
      await rm(join(fixture, textAt(modelFiles, 0)));
      await symlink(join(root, textAt(modelFiles, 0)), join(fixture, textAt(modelFiles, 0)));
      await assert.rejects(
        execute(process.execPath, [join(fixture, guardPath)], { cwd: fixture }),
        (error: unknown) => error instanceof Error && "stderr" in error && typeof error.stderr === "string" && /must be a non-symlink regular file/u.test(error.stderr),
      );
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
