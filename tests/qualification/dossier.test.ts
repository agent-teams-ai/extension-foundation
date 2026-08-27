import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { CONFORMANCE_VERSION } from "../../architecture/checks/package-policy.mjs";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const dossier = resolve(repositoryRoot, "docs/qualification/universal-module-extension-system");
const decisions = resolve(repositoryRoot, "docs/decisions");
const openDecisions = resolve(repositoryRoot, "docs/open-decisions");

interface RequirementDefinition {
  readonly id: string;
  readonly kind: "decision" | "evidence";
  readonly detail: string;
}

type GateRequirement = Readonly<
  | { decision: string; requiredStatus: string }
  | { evidence: string; requiredStatus: string }
  | { gate: string; requiredStatus: string }
>;

interface DecisionLedger {
  readonly schemaVersion: number;
  readonly sourceRepository: string;
  readonly sourceRevision: string;
  readonly sourcePurpose: string;
  readonly retiredIdentifiers: readonly { readonly id: string; readonly detail?: string }[];
  readonly externalDecisionGates: readonly {
    readonly id: string;
    readonly status: string;
    readonly detail: string;
    readonly approvalTrackedBy: string;
  }[];
  readonly requirementDefinitions: readonly RequirementDefinition[];
  readonly implementationGates: readonly {
    readonly id: string;
    readonly appliesTo: readonly string[];
    readonly mode: "all" | "exactly-one-path";
    readonly allOf?: readonly GateRequirement[];
    readonly paths?: readonly { readonly id: string; readonly allOf: readonly GateRequirement[] }[];
  }[];
  readonly entries: readonly {
    readonly id: string;
    readonly status: string;
    readonly authority: string;
    readonly detail: string;
    readonly approvalRequired: boolean;
  }[];
}

interface OssEvidence {
  readonly kind: "git-commit" | "npm-release" | "artifact-digest";
  readonly repository?: string;
  readonly revision?: string;
  readonly url?: string;
  readonly package?: string;
  readonly version?: string;
  readonly integrity?: string;
  readonly locked?: boolean;
  readonly command?: string;
  readonly digest?: string;
}

interface OssCandidate {
  readonly id: string;
  readonly versionOrRevision: string;
  readonly evidenceStatus: "pinned" | "orientation" | "qualified-experiment";
  readonly evidence?: readonly OssEvidence[];
}

interface MarkdownDocument {
  readonly path: string;
  readonly body: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

function markdownAnchor(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseMarkdown(path: string, body: string): MarkdownDocument {
  const normalizedBody = body.replace(/\r\n?/g, "\n");
  const frontmatter = normalizedBody.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  assert.ok(frontmatter, `${path} must have YAML frontmatter`);
  const metadata = parse(frontmatter[1]!) as unknown;
  assert.ok(typeof metadata === "object" && metadata !== null && !Array.isArray(metadata));
  return { path, body: normalizedBody, metadata: metadata as Readonly<Record<string, unknown>> };
}

async function readMarkdown(path: string): Promise<MarkdownDocument> {
  return parseMarkdown(path, await readFile(path, "utf8"));
}

async function findDocumentById(directory: string, id: string): Promise<MarkdownDocument> {
  const names = (await readdir(directory)).filter(name => name.endsWith(".md"));
  const matches: MarkdownDocument[] = [];
  for (const name of names) {
    const document = await readMarkdown(resolve(directory, name));
    if (document.metadata.id === id) matches.push(document);
  }
  assert.equal(matches.length, 1, `${id} must resolve to exactly one document`);
  return matches[0]!;
}

function section(markdown: string, heading: RegExp): string {
  const headings = [...markdown.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  const startIndex = headings.findIndex(match => heading.test(match[2]!));
  assert.notEqual(startIndex, -1, `missing section ${heading}`);
  const start = headings[startIndex]!;
  const level = start[1]!.length;
  const next = headings.slice(startIndex + 1).find(match => match[1]!.length <= level);
  return markdown.slice(start.index! + start[0].length, next?.index ?? markdown.length);
}

function assertMarkers(text: string, markers: readonly RegExp[], context: string): void {
  for (const marker of markers) assert.match(text, marker, `${context} is missing ${marker}`);
}

function gateRequirements(gate: DecisionLedger["implementationGates"][number]): readonly GateRequirement[] {
  return [...(gate.allOf ?? []), ...(gate.paths ?? []).flatMap(path => path.allOf)];
}

test("Markdown qualification parsing is independent of checkout line endings", () => {
  const document = parseMarkdown(
    "portable.md",
    "---\r\nid: ADR-TEST\r\nstatus: accepted\r\n---\r\n\r\n# Portable\r\n",
  );

  assert.equal(document.metadata.id, "ADR-TEST");
  assert.equal(document.metadata.status, "accepted");
  assert.equal(document.body, "---\nid: ADR-TEST\nstatus: accepted\n---\n\n# Portable\n");
});

test("decision ledger is referentially sound and records current implementation gates", async () => {
  const ledgerPath = resolve(dossier, "decision-ledger.yaml");
  const ledger = parse(await readFile(ledgerPath, "utf8")) as DecisionLedger;
  const currentState = await readFile(resolve(dossier, "current-state.md"), "utf8");

  assert.ok(ledger.schemaVersion >= 2);
  assert.equal(ledger.sourceRepository, "agent-teams-ai/extension-foundation");
  assert.equal(ledger.sourcePurpose, "immutable-analyzed-baseline");
  assert.match(ledger.sourceRevision, /^[0-9a-f]{40}$/);
  const documentedRevision = currentState.match(
    /`agent-teams-ai\/extension-foundation` \| `([0-9a-f]{40})`/,
  )?.[1];
  assert.equal(documentedRevision, ledger.sourceRevision);

  const activeEntries = [...ledger.entries, ...ledger.externalDecisionGates];
  const identifiers = [
    ...activeEntries.map(entry => entry.id),
    ...ledger.retiredIdentifiers.map(entry => entry.id),
    ...ledger.requirementDefinitions.map(entry => entry.id),
    ...ledger.implementationGates.map(entry => entry.id),
  ];
  assert.equal(new Set(identifiers).size, identifiers.length, "ledger identifiers must be globally unique");
  assert.ok(ledger.entries.filter(entry => entry.approvalRequired).every(entry => (
    entry.status === "open" && entry.authority.length > 0
  )));
  assert.ok(ledger.externalDecisionGates.every(entry => entry.approvalTrackedBy === "adr-lifecycle"));

  const decisionIds = new Set([
    ...activeEntries.map(entry => entry.id),
    ...ledger.requirementDefinitions.filter(entry => entry.kind === "decision").map(entry => entry.id),
  ]);
  const evidenceIds = new Set(
    ledger.requirementDefinitions.filter(entry => entry.kind === "evidence").map(entry => entry.id),
  );
  const gateIds = new Set(ledger.implementationGates.map(entry => entry.id));
  const usedDefinitions = new Set<string>();
  const gateDependencies = new Map<string, string[]>();

  for (const gate of ledger.implementationGates) {
    assert.ok(gate.appliesTo.length > 0, `${gate.id} must name its protected phase`);
    if (gate.mode === "all") {
      assert.ok((gate.allOf?.length ?? 0) > 0, `${gate.id} requires allOf entries`);
      assert.equal(gate.paths, undefined, `${gate.id} cannot mix allOf and paths`);
    } else {
      assert.ok((gate.paths?.length ?? 0) > 0, `${gate.id} requires alternative paths`);
      assert.equal(gate.allOf, undefined, `${gate.id} cannot mix allOf and paths`);
    }
    gateDependencies.set(gate.id, []);
    for (const requirement of gateRequirements(gate)) {
      const keys = ["decision", "evidence", "gate"].filter(key => key in requirement);
      assert.equal(keys.length, 1, `${gate.id} requirement must have one typed reference`);
      assert.ok(requirement.requiredStatus.length > 0);
      if ("decision" in requirement) {
        assert.ok(decisionIds.has(requirement.decision), `${gate.id} references unknown decision ${requirement.decision}`);
        if (ledger.requirementDefinitions.some(entry => entry.id === requirement.decision)) {
          usedDefinitions.add(requirement.decision);
        }
      } else if ("evidence" in requirement) {
        assert.ok(evidenceIds.has(requirement.evidence), `${gate.id} references unknown evidence ${requirement.evidence}`);
        usedDefinitions.add(requirement.evidence);
      } else {
        assert.ok(gateIds.has(requirement.gate), `${gate.id} references unknown gate ${requirement.gate}`);
        assert.notEqual(requirement.gate, gate.id);
        gateDependencies.get(gate.id)!.push(requirement.gate);
      }
    }
  }
  assert.deepEqual(
    [...usedDefinitions].sort(),
    ledger.requirementDefinitions.map(entry => entry.id).sort(),
    "every requirement definition must protect an implementation gate",
  );

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    assert.ok(!visiting.has(id), `implementation gate cycle at ${id}`);
    visiting.add(id);
    for (const dependency of gateDependencies.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of gateIds) visit(id);

  const serializedGates = JSON.stringify(ledger.implementationGates);
  assertMarkers(serializedGates, [
    /ADR-0013/,
    /second-independent-consumer/,
    /foundation-(?:semantic-)?extraction-decision[^}]*accepted/i,
  ], "decision ledger gates");
  const phaseOneGate = ledger.implementationGates.find(gate => gate.id === "phase-1-static-module-rehearsal");
  assert.ok(phaseOneGate, "phase-1 static module rehearsal gate is required");
  assert.deepEqual(
    gateRequirements(phaseOneGate).map(requirement => "decision" in requirement ? requirement.decision : null),
    ["ADR-0013", "ADR-0014", "owning-product-feature-decision"],
  );

  const knownUmeqIds = new Set([
    ...ledger.entries.map(entry => entry.id),
    ...ledger.retiredIdentifiers.map(entry => entry.id),
  ]);
  for (const name of (await readdir(dossier)).filter(name => /\.(?:md|ya?ml)$/.test(name))) {
    const contents = await readFile(resolve(dossier, name), "utf8");
    for (const id of contents.match(/\bUMEQ-[A-Z0-9-]+\b/g) ?? []) {
      assert.ok(knownUmeqIds.has(id), `${name} references unledgered ${id}`);
    }
  }

  for (const entry of [...activeEntries, ...ledger.requirementDefinitions]) {
    const [relativePath, fragment] = entry.detail.split("#", 2);
    const targetPath = resolve(dirname(ledgerPath), relativePath!);
    const contents = await readFile(targetPath, "utf8");
    if (fragment) {
      const anchors = [...contents.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => markdownAnchor(match[1]!));
      assert.ok(anchors.includes(fragment), `${entry.id} has a stale detail anchor`);
    }
  }
});

test("accepted ADR-0013 cumulatively replaces ADR-0012 without premature extraction", async () => {
  const adr13 = await findDocumentById(decisions, "ADR-0013");
  assert.equal(adr13.metadata.status, "accepted");
  assert.deepEqual(adr13.metadata.supersedes, ["ADR-0012"]);

  section(adr13.body, /^(?:Decision|Accepted Decision)$/i);
  assertMarkers(adr13.body, [
    /(?:orthogonal|distinct)[\s\S]{0,120}(?:roles|boundaries)|(?:roles|boundaries)[\s\S]{0,120}(?:orthogonal|distinct)/i,
    /(?:reusable|product-scoped)?\s*librar(?:y|ies)(?: core)?/i,
    /module adapter/i,
    /plugin artifact/i,
    /Product-first composition/i,
    /Product-local feature code and static Pure DI composition are the default/i,
    /first product can rehearse static composition/i,
    /two (?:real )?independently authored consumers/i,
    /(?:separate|explicit) accepted extraction decision/i,
  ], "ADR-0013");
  assert.match(adr13.body, /ADR-0012[\s\S]{0,160}(?:incorporat|preserv|cumulative)/i);
  assert.doesNotMatch(adr13.body, /first consumer[^.]{0,160}(?:public SPI|Foundation package)[^.]{0,80}(?:publish|admit)/i);
});

test("accepted ADR-0014 records evidence only and grants no production surface", async () => {
  const adr14 = await findDocumentById(decisions, "ADR-0014");
  assert.equal(adr14.metadata.status, "accepted");
  section(adr14.body, /^(?:Decision|Accepted Decision)$/i);
  const noAuthorityStatement = adr14.body.split(/\n\s*\n/).find(paragraph => (
    /(?:does not|no)[\s\S]{0,40}(?:authorize|admit|approve|authority)/i.test(paragraph)
    && /Foundation package/i.test(paragraph)
    && /public SPI/i.test(paragraph)
    && /(?:production module runtime|graph host)/i.test(paragraph)
  ));
  assert.ok(noAuthorityStatement, "ADR-0014 must deny all three production authorizations together");
});

test("OD-003 stays open without embedding accepted normative decisions", async () => {
  const od3 = await findDocumentById(openDecisions, "OD-003");
  assert.equal(od3.metadata.status, "open");
  assert.doesNotMatch(od3.body, /^#{1,6}\s+Resolved Sub-?Decisions\s*$/gim);
  assert.doesNotMatch(od3.body, /approved the following foundations[\s\S]{0,80}no longer alternatives/i);

  const acceptedReferences = Array.isArray(od3.metadata.related)
    ? od3.metadata.related.filter(id => /^ADR-\d{4}$/.test(String(id)))
    : [];
  assert.ok(acceptedReferences.includes("ADR-0013"));
  assert.ok(acceptedReferences.includes("ADR-0014"));
  for (const id of acceptedReferences) {
    const adr = await findDocumentById(decisions, String(id));
    assert.equal(adr.metadata.status, "accepted", `OD-003 points to non-accepted ${id}`);
  }
});

test("the dossier has one trigger-gated roadmap with static Pure DI first", async () => {
  const roadmap = await Promise.all([
    "current-state.md",
    "final-recommendation.md",
    "invariant-map.md",
    "module-graph.md",
    "product-adoption.md",
  ].map(name => readFile(resolve(dossier, name), "utf8"))).then(files => files.join("\n"));

  assertMarkers(roadmap, [
    /(?:Phase 1|first)[\s\S]{0,220}(?:static|compile-time) Pure DI[\s\S]{0,220}(?:rehearsal|slice)/i,
    /static Pure DI rehearsal[\s\S]{0,180}private (?:product )?graph only after/i,
    /private (?:product )?graph[\s\S]{0,180}(?:only after|measured)/i,
    /(?:Agent Runtime|\bAR\b)[\s\S]{0,220}descriptor[\s\S]{0,220}not[\s\S]{0,100}(?:second|independent)[\s\S]{0,80}(?:graph|lifecycle) consumer/i,
  ], "roadmap");
  assert.doesNotMatch(roadmap, /(?:current|recommended|Phase 1)[^\n]{0,140}graph[- ]first/i);
  assert.doesNotMatch(roadmap, /graph[\s\S]{0,80}(?:before|precedes)[\s\S]{0,80}(?:static|compile-time) Pure DI/i);
});

test("identity and build descriptions preserve a single inert metadata authority", async () => {
  const graph = await readFile(resolve(dossier, "module-graph.md"), "utf8");
  assertMarkers(graph, [
    /exactly one metadata authority[\s\S]{0,120}module-local[\s\S]{0,120}inert data/i,
    /generated TypeScript handles/i,
    /\brequired\b[\s\S]{0,80}\boptional\b[\s\S]{0,80}\bmany\b/i,
    /Every resolved slot[\s\S]{0,100}explicit coordinate/i,
    /profile supplies selections/i,
    /(?:null|none)[\s\S]{0,120}(?:optional|slot)|optional[\s\S]{0,120}(?:null|none)/i,
    /ordered (?:provider )?(?:list|bindings|collection)/i,
    /Discovery parses[\s\S]{0,100}never imports\s+TypeScript/i,
    /executes a getter or decorator/i,
    /resolves the activation[\s\S]{0,20}entrypoint/i,
  ], "module graph");
  assert.doesNotMatch(graph, /(?:hand-maintained|global) (?:registry|catalog)[\s\S]{0,100}(?:canonical|authoritative) source/i);
});

test("lifecycle semantics are fail-closed, durable, and explicitly ordered", async () => {
  const lifecycle = await readFile(resolve(dossier, "lifecycle-and-concurrency.md"), "utf8");
  const graph = await readFile(resolve(dossier, "module-graph.md"), "utf8");
  assert.match(`${graph}\n${lifecycle}`, /selected provider[\s\S]{0,120}(?:failure|fails)[\s\S]{0,100}(?:abort|fail)/i);
  assertMarkers(lifecycle, [
    /three[\s\S]{0,40}non-renewable absolute horizons/i,
    /expectedDesiredHead[\s\S]{0,100}expectedActiveHead[\s\S]{0,180}(?:serialized|compare)/i,
    /durable[\s\S]{0,100}(?:restart_required[\s\S]{0,100}high-water|high-water[\s\S]{0,100}restart_required)/i,
    /staged runtime[\s\S]{0,100}pins?/i,
    /state migration gate/i,
    /StateCustodyAuthorization/,
    /separate\s+immutable[\s\S]{0,160}(?:ActivationPlan|activation)[\s\S]{0,160}(?:DrainPlan|drain)[\s\S]{0,160}(?:RetirementPlan|retirement)[\s\S]{0,160}(?:MigrationPlan|migration)/i,
  ], "lifecycle model");
  assertMarkers(lifecycle, [
    /activation\s+(?:DAG|order|projection)/i,
    /drain\s+(?:order|projection)/i,
    /retirement\s+(?:order|projection|follows)/i,
    /migration\s+(?:order|projection|follows)/i,
  ], "lifecycle order projections");
});

test("trust claims distinguish current evidence from future supply-chain work", async () => {
  const trust = await Promise.all([
    "trust-and-security.md",
    "catalog-and-profiles.md",
    "current-state.md",
    "spike-results.md",
    "final-recommendation.md",
  ].map(name => readFile(resolve(dossier, name), "utf8"))).then(files => files.join("\n"));

  assertMarkers(trust, [
    /`T1` fault-contained[^|]*\|[^|]*fault containment[^|]*(?:not|no)[^|]*(?:sandbox|isolation)/i,
    /audited `T0` built-in/i,
    /direct[- ]digest[\s\S]{0,180}manual[- ]pin[\s\S]{0,180}(?:no|without|not)[\s\S]{0,100}currentness/i,
    /does not contain or qualify production OCI\/ORAS, Cosign\/Sigstore or TUF\s+adapters/i,
    /TUF[\s\S]{0,120}(?:before|required prior to)[\s\S]{0,120}mutable (?:managed )?channels/i,
  ], "trust-phase evidence");
});

test("qualified identity and extraction controls remain contiguous and authoritative", async () => {
  const antiPatterns = await readFile(resolve(dossier, "anti-patterns.md"), "utf8");
  const moduleGraph = await readFile(resolve(dossier, "module-graph.md"), "utf8");
  const antiPatternIds = [...antiPatterns.matchAll(/^\| (AP-\d{3}) \|/gm)].map(match => match[1]);
  const numbers = antiPatternIds.map(id => Number(id!.slice(3)));

  assert.ok(numbers.length >= 96);
  assert.deepEqual(numbers, Array.from({ length: numbers.length }, (_, index) => index + 1));
  assert.match(antiPatterns, /AP-080 \| Extract a neutral package without satisfying an accepted ADR-0013 package-admission basis/);
  assert.match(moduleGraph, /`BuiltInModuleInstallation` activation-source identity/);
  assert.match(moduleGraph, /product authority scope, stable module identity, and immutable implementation\s+digest/);
});

test("OSS comparison distinguishes immutable evidence from orientation research", async () => {
  const lock = parse(await readFile(resolve(repositoryRoot, "pnpm-lock.yaml"), "utf8")) as {
    readonly packages: Readonly<Record<string, { readonly resolution?: { readonly integrity?: string } }>>;
  };
  const record = parse(await readFile(resolve(dossier, "oss-comparison.yaml"), "utf8")) as {
    readonly schemaVersion: number;
    readonly candidates: readonly OssCandidate[];
  };
  assert.equal(record.schemaVersion, 1);
  assert.ok(CONFORMANCE_VERSION.test("1.0.0-rc.4"));
  for (const invalid of ["01.0.0", "1.01.0", "1.0.01", "1.0.0-01", "1.0.0-alpha..1"]) {
    assert.ok(!CONFORMANCE_VERSION.test(invalid), `invalid SemVer accepted: ${invalid}`);
  }
  assert.equal(new Set(record.candidates.map(candidate => candidate.id)).size, record.candidates.length);
  for (const candidate of record.candidates) {
    if (candidate.evidenceStatus === "orientation") assert.match(candidate.versionOrRevision, /^reviewed-/);
    if (candidate.evidenceStatus === "pinned") {
      assert.doesNotMatch(candidate.versionOrRevision, /^(?:reviewed-|latest$)/);
      assert.ok((candidate.evidence?.length ?? 0) > 0, `${candidate.id} requires immutable evidence`);
    }
    if (candidate.evidenceStatus === "qualified-experiment") {
      assert.ok(candidate.evidence?.some(evidence => evidence.kind === "artifact-digest"));
    }
    for (const evidence of candidate.evidence ?? []) {
      if (evidence.kind === "git-commit") {
        assert.match(evidence.repository ?? "", /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
        assert.match(evidence.revision ?? "", /^[0-9a-f]{40}$/);
        assert.equal(evidence.url, `${evidence.repository}/commit/${evidence.revision}`);
      } else if (evidence.kind === "npm-release") {
        assert.match(evidence.version ?? "", CONFORMANCE_VERSION);
        assert.match(evidence.integrity ?? "", /^sha512-[A-Za-z0-9+/]+={0,2}$/);
        if (evidence.locked) {
          assert.equal(lock.packages[`${evidence.package}@${evidence.version}`]?.resolution?.integrity, evidence.integrity);
        }
      } else {
        assert.match(evidence.url ?? "", /^https:\/\//);
        assert.match(evidence.digest ?? "", /^sha256:[0-9a-f]{64}$/);
        assert.ok((evidence.command?.length ?? 0) > 0);
      }
    }
  }
});

test("no qualification result admits a production package", async () => {
  const packageCatalog = JSON.parse(await readFile(resolve(repositoryRoot, "architecture/package-catalog.json"), "utf8")) as {
    readonly packages?: readonly unknown[];
  };
  assert.deepEqual(packageCatalog.packages, []);
});
