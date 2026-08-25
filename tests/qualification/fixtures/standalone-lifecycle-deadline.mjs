import { compileGraph } from "../graph-spike.ts";
import { GenerationLifecycle, inertHooks } from "../lifecycle-spike.ts";

const phase = process.argv[2];
if (!["prepare", "start", "blocking-start", "stop"].includes(phase)) throw new Error("UNKNOWN_PHASE");

const authorityScope = "tenant:test/project:test";
const lifecycle = new GenerationLifecycle(authorityScope);
const compile = id => {
  const result = compileGraph([{ id, requires: [] }]);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result.plan;
};
const request = (operationId, plan, hooks) => ({
  identity: {
    operationId,
    activationSourceDigest: `sha256:${operationId}`,
    expectedActiveGeneration: lifecycle.activeGeneration,
    authorityScope,
    profileLockDigest: "sha256:profile",
    configurationFingerprint: "sha256:configuration",
    grantRevision: "grant-1",
    hostPolicyRevision: "policy-1",
  },
  plan,
  hooks,
  absoluteDeadline: lifecycle.deadlineAfter(20),
  cleanupTimeoutMs: 20,
});
const never = () => new Promise(() => undefined);

let result;
if (phase === "stop") {
  const oldPlan = compile("old");
  await lifecycle.activate(request("old", oldPlan, new Map([["old", inertHooks({ stop: never })]])));
  const candidatePlan = compile("candidate");
  result = await lifecycle.activate(request(
    "candidate",
    candidatePlan,
    new Map([["candidate", inertHooks()]]),
  ));
} else if (phase === "blocking-start") {
  const plan = compile("candidate");
  result = await lifecycle.activate(request(
    phase,
    plan,
    new Map([["candidate", inertHooks({
      start: () => {
        const deadline = Date.now() + 100;
        while (Date.now() < deadline) {
          // Deliberately block the event loop to qualify cooperative T0 deadlines.
        }
      },
      stop: () => undefined,
    })]]),
  ));
} else {
  const plan = compile("candidate");
  result = await lifecycle.activate(request(
    `hung-${phase}`,
    plan,
    new Map([["candidate", inertHooks({ [phase]: never })]]),
  ));
}

process.stdout.write(`${JSON.stringify(result)}\n`);
