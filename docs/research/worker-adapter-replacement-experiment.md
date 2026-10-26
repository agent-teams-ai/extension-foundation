---
id: research.worker-adapter-experiment
type: research
status: active
owner: architecture
summary: Executed published-package evidence for readiness, admission, task outcomes, closure and actual Worker exit.
---

# Worker Adapter Replacement Experiment

Executed evidence cut: **2026-10-22**. The original eight-case study and the later
independent two-worker rejecting case are separate observations.

## Outcome and scope

**Eight bounded single-worker fixtures passed in the final harness, then passed again unchanged. A later independent two-worker fixture confirmed a premature graceful-close case in Piscina 5.3.2.** The original study favors **Piscina as a conditional single-worker task-execution reuse candidate** for the already proposed bounded, trusted request cohort, while preserving direct Node Worker as the comparator. It also identifies a concrete reason not to translate workerpool's `terminate()` resolution or `onTerminateWorker` callback into execution absence. This is disposable evidence, not a production adapter, lifecycle manager, kernel implementation, replacement rollout, benchmark or public-SPI qualification.

The experiment resolves narrow uncertainties: queued versus started tasks at pool closure, admission during closure, delayed readiness, timeout settlement, explicit forced termination, skipped task `finally`, and observations actually available through public APIs. It runs no external provider, effect, persistence layer, canonical admission, generation publication, state migration or GM/EF runtime. No repository source or accepted ADR was changed. The existing GM lifecycle-kernel candidate remains the sole proposed owner of its admitted local membership/lease facts; no copy of its state machine was written.

## Exact experiment identity

Frozen inputs and results are retained in
[worker-adapter-20261022.tar.gz](evidence/worker-adapter-20261022.tar.gz)
(**298,032 bytes**, SHA-256
`48a38ed58a4826232910d024d230010c824d68a3158a32494edb959c7110a27a`).
Its 44 files include the two adjacent experiment directories, source/manifests,
exact lockfile, verified package tarballs, provenance, build/run logs, failed
attempts, reproduction instructions and `SHA256SUMS`. Every archived file was
compared byte-for-byte with its retained input after packaging. `node_modules`
and generated `dist` are rebuilt from the frozen inputs; they are not archived.
This is historical executable evidence, not a maintained production source root.

The original study is `experiments/worker-adapter/`: five ordinary `.ts` files,
180 handwritten source lines, plus its exact config and evidence. Its
`source-sha256.txt` binds manifests and source. The later case is
`experiments/piscina-staggered-close/`, with separate source, effective compiler
config, hashes, logs and README reproduction. It reuses the original installed
packages and compiled worker without changing the eight-case input or results.

| Component | Executed identity |
| --- | --- |
| OS | Ubuntu 24.04.3 LTS; Linux 6.18.55; x86_64 |
| Node | 26.11.1, located through `/tmp/plugin-portability-toolchain-20261022/bin` |
| pnpm | 11.18.0 |
| TypeScript | 7.0.2, installed exact; `tsc --version` verified |
| Node declarations | `@types/node` 26.6.5 exact |
| Piscina | Published npm 5.3.2, MIT; registry `latest` was 5.3.2; registry RC tag was 6.0.0-rc.5 and was not selected |
| workerpool | Published npm 10.0.3, Apache-2.0; registry `latest` was 10.0.3 |

Primary npm metadata was retrieved before dependency installation on 2026-10-22; retained `piscina-registry.json` and `workerpool-registry.json` record dist-tags and distributions. Both exact tarballs were fetched separately and their SHA-512 integrity recomputed and matched to registry metadata. `installed-identity.json` verifies the tarball manifest version, installed manifest version, and selected tarball-source bytes versus installed-source bytes. `integrity-verification.json` retains these identities and source comparisons.

| Published tarball | Verified integrity | SHA-256 |
| --- | --- | --- |
| `https://registry.npmjs.org/piscina/-/piscina-5.3.2.tgz` | `sha512-vv7l/mM7B9WgrhDaudIqv1x6v4LOBRYYmpWGdWushhpbCmVHp11sUB2v4hj1CAeTGXVxuZFz6xOU1RalAiPKfQ==` | `d9a3875ba7ae77180e8a3d4b8ce89639377bb5339605fb91e2873e6c73832d2c` |
| `https://registry.npmjs.org/workerpool/-/workerpool-10.0.3.tgz` | `sha512-6z2Iis68Wqth93/G/wJP9u+R3O+d2XTlgWChGCwuT1qLbBsOYueGRZuJ++v3mtDP5KjYdy+WzvWC+VWETSVXJA==` | `394a30d753961e412f4b78de6a9f6f9ae522039a1e4c131e830fed67b60fb286` |

**Piscina tag/version discrepancy resolved for this run:** the earlier inspected GitHub commit `6c7e54630a8c28a96ce5c0625b463d849d21171c` has the known package.json 5.3.1 caveat. The actually executed npm package and its tarball both say **5.3.2**. Its included `src/index.ts` is byte-identical to that commit's `src/index.ts`, SHA-256 `be60f213c8d360a4f77c91125a07b95c36496a5811a9717c9430df2bab02ac4d`. That verifies this source file, not an assertion that every tag/release/tarball file is identical. The registry response did not supply a Piscina gitHead in the retained field set.

workerpool registry gitHead is `601124cf86602c1ac88c273a8f99e9c40bea0f16`. Its published and installed `src/Pool.js` are byte-identical to that pin, SHA-256 `8bf7bea6f69af3aa775e93026a6edb420b0f28dcad9f387500993a655ef456be`. This is newer than the earlier report's inspected commit; conclusions here are scoped to the installed tarball.

## Fixture design and observations

All pools use one worker and explicit script filenames. Task A is confirmed started before task B is enqueued. The task writes a SharedArrayBuffer `started` flag, blocks on an Atomics barrier, records normal completion, then records entry into its synchronous `finally`. The host opens barriers deliberately. Each asynchronous barrier poll has a three-second deadline; the complete run has a thirty-second watchdog. Fifty-millisecond library close timeouts trigger the two timeout classes; no elapsed-time performance claim is made.

The initializer has separate `entered`, `release`, and `ready` cells. Thus readiness is deliberately withheld, without inferring readiness from a delay. Four task cells mean `[started, released-by-host, normal-completion, finally-executed]`. In the queued-cancellation case a release flag can be set even though the task never ran; the independent started/completed/finally cells avoid misinterpreting it.

| # | Executed fixture | Actual final-run observation |
| ---: | --- | --- |
| 1 | Piscina `close({force:false})`, A started and B queued | A and B both fulfilled after release; both task finally markers ran. A new `run()` during close rejected with AbortError. Close fulfilled; one actual underlying Worker `exit` was observed. |
| 2 | Piscina `close({force:true})`, A started and B queued | A finished naturally with finally; queued B rejected AbortError and never started. New `run()` during close rejected. Close fulfilled and Worker exit was observed. Here `force:true` cancels queued work; it does not itself abort the running A. |
| 3 | Piscina `close()` with `closeTimeout:50`, A held indefinitely, B queued | Close **fulfilled**, while its error listener received `Close operation timed out`. A and B rejected `Terminating worker thread`. A was started but neither its normal-completion nor finally marker ran. One actual Worker exit was observed before the recorded close outcome. |
| 4 | Piscina worker module exports a Promise withheld behind initializer barrier | At initializer entry, ready=0 and task-started=0 despite an already submitted `run()`. Opening readiness and task barriers yielded the expected task result, then close and Worker exit. This confirms supported asynchronous handler readiness for this script. |
| 5 | workerpool `terminate(false,1000)`, A started and B queued; admission during and after terminate | Preexisting queued B rejected `Pool terminated`; A fulfilled with finally. An `exec()` issued **during** termination was accepted into the public pending queue (pending=1 while A busy), and eventually fulfilled. A subsequent `exec()` **after** terminate fulfilled with a new worker. The pool termination operation is not a permanent admission seal. |
| 6 | workerpool `terminate(false,50)` while A held; later release A | Terminate **fulfilled** with `[undefined]` (JSON log `[null]`) while A was still unsettled, `activeTasks=1`, `busyWorkers=1`, and finally=0. `onTerminateWorker` had already fired once. Opening A's barrier then produced normal A completion and finally=1. The immediate task-settlement snapshot still showed busy bookkeeping; it is not treated as a later physical observation. |
| 7 | Same workerpool timeout, followed by explicit `terminate(true)` | Initial terminate again fulfilled while A remained busy/unsettled and the hook had fired. The separate forced termination rejected A with `Worker terminated`; A's finally remained 0; the forced termination returned and pool stats reached zero. No underlying Worker exit event was accessible through the pool public API used here. |
| 8 | Direct Node Worker `online`, withheld initializer readiness, then terminate running A | Worker `online` was observed while ready=0. After the explicit ready message, A started. `Worker.terminate()` returned 1, matching observed Worker exit code 1; A never recorded normal completion or finally. |

`run-final.log` and `run-repeat.log` each contain the eight case records and `cases:8, passed:8`. These are two complete runs of the final harness, not sixteen independent implementations or sixteen distinct scenarios. No relative speed or resource benchmark was attempted. Exit code 1 appears both after Piscina's naturally completed tasks and after explicit termination; it does not by itself classify natural task completion. The task outcomes/finally evidence and close cause remain separate observations.

## Source explanation for the surprising workerpool result

**Source inspection:** installed `Pool.js` creates each worker termination promise with `terminateAndNotify(force,timeout).then(removeWorker).always(onTerminateWorker)` and returns its custom `Promise.all`. Installed `WorkerHandler.js` implements the supplied timeout by timing out its termination notification promise. Installed custom `Promise.js` defines `always(fn)` as `then(fn,fn)`, which turns the handler's returned undefined into a fulfilled derived promise. Thus an internal timeout can reach the hook and become public fulfillment without `removeWorker` or actual termination having completed. This source explanation is consistent with the execution trace; the trace is the primary evidence of the observed behavior.

The README sentence suggesting that the provided termination timeout forces an unfinished worker is therefore insufficient for the exercised **10.0.3 thread** behavior. Its TypeScript/JSDoc wording about rejection at timeout also does not describe the observed public Pool outcome. Do not generalize this to other versions, web workers or subprocess workers without running them. Do not silently patch or fork the library in an adoption proposal; require an upstream clarification/fix or an adapter strategy with separately demonstrated evidence.

For workerpool this experiment deliberately used only supported pool methods, stats and hooks. It did not deep-import WorkerHandler or retrieve private Worker handles. The public hook was observed to occur before the blocked task completed; it is positively unsuitable as physical-exit proof for this case. The forced-close zero-worker stats are reported as stats, not silently upgraded to observed Node exit.

## Honest failure and correction record

The first compiler attempt, retained as `build-attempt-1.log`, failed inside Piscina 5.3.2's published declaration: `FilledOptions` extends `Options` but its `atomics` property includes undefined, incompatible with `exactOptionalPropertyTypes:true`. No dependency was modified. The final config keeps **strict**, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and ordinary `.ts` source; it uses `skipLibCheck:true` for third-party declarations. `pnpm check` and build then passed. An adoption needing dependency-declaration validation without that setting must resolve this concrete incompatibility. This result is not evidence that strict dependency declaration checking passed.

`run-attempt-1.log` records the first five completed fixtures and the thirty-second watchdog. The first harness incorrectly assumed the workerpool timeout would settle the task, and awaited the still-blocked task. The corrected second attempt distinguished task and close promises, but assumed the public close promise would reject; `run-attempt-2.log` retains that assertion failure. Inspection explained the observed fulfillment, and the final tests now assert the actual outcome. `run-attempt-3.log` passed the earlier eight-case version; `run-final.log` and `run-repeat.log` add and pass the explicit during-termination admission check within case 5. Failures were harness assumptions, not relabeled passing library behavior.

## Decision implications and limits

**Inference:** Piscina supplies real reusable bounded queue/task/readiness/close machinery for the initial task-shaped cohort. Its public `threads` property allows attaching Node Worker exit listeners without private access. Its close options distinguish finishing a preexisting queue from rejecting it. This is useful reuse over bespoke queueing, but requires an error listener and separate task/close/exit observations. A timeout fulfilled close must be classified as forced task loss with its error cause, never “all requests completed naturally.” A pool per immutable generation remains a candidate design, not an implementation proven here.

**Inference:** workerpool remains valuable as an established cross-target task abstraction, but its current exercised termination surface needs more adaptation than its short documentation suggests. Host admission must close independently. Existing queued accepted work must receive an explicit disposition because default termination rejects it. A hook, stats count and returned Promise cannot be flattened into a physical-exit Boolean. These findings weaken a claim that one small workerpool wrapper already supplies the requested target-neutral retirement evidence. They do not refute its browser/task usefulness.

**Inference:** direct Worker remains attractive when the actual replaceable object is one long-lived capability owner with explicit control messages, background listeners or non-task cleanup. This fixture does not implement its routing, queue, cancellation, correlation or readiness protocol beyond a disposable control message, so it does not establish that direct Worker requires less maintained production code than Piscina. No LOC savings were measured; retain the earlier report's estimates as estimates only. Neither pool nor direct Worker made finally run on forced termination, and `online` was not application readiness.

Neither task completion nor observed Worker exit proves canonical acceptance, complete kernel retirement, resource transfer, descendant cleanup, remote effect disposition or recovery after host process loss. In the original eight-case study there was no generation publication, lost-ACK simulation, host crash, DB commit, external write, untracked callback, stream escape, repeated-churn memory study, multiworker scaling, malicious plugin, native exclusive resource, browser, Windows or macOS execution. The separate two-worker case below tests one additional closure behavior, not scalability. Pool reusability after completed Piscina close was not tested. No Node 26 versus supported stable-runtime compatibility claim beyond this exact execution follows. Additional tests are justified only by the chosen real slice and its owner decisions.

## Additional rejecting case: two-worker Piscina close

An independent final evidence critic inspected the exact installed close
implementation and identified repeated completion-listener registration without
per-worker identity deduplication. That concrete new risk justified one focused
experiment; the prior eight-case campaign was not rerun or modified.

Both workers were positively confirmed started behind separate Atomics barriers.
The fixture called `close({ force: false })` with `closeTimeout: 1000`, then
released only task A. A 300 ms observation bound separated early close from
waiting for task B; it is not a performance measurement.

| Observation | Executed result in Piscina 5.3.2 |
| --- | --- |
| Before close | A and B both started; neither barrier released |
| After releasing only A | Close fulfilled before the observation bound; no pool error event |
| A | Fulfilled; normal-completion and finally markers set |
| B | Rejected `Terminating worker thread`; its release, completion and finally markers were still zero at the early snapshot |
| Execution | Two actual underlying Node Worker exits observed |
| Later release of B's barrier | No normal completion or finally appeared |

The fixture reports `cases:1,passed:1` because the **rejecting observation** was
asserted successfully. It does not mean multiworker graceful drain passed. This
case was executed once. Together with the original eight distinct cases and
their unchanged repeat, it is nine distinct scenarios, not seventeen independent
implementations or a general pool qualification.

The installed `src/index.ts` flush routine registers a completion callback once
before the worker loop and again for each worker. Each callback increments
a scalar count when it sees an empty worker, without recording that worker's
identity as already counted. The worker pool invokes all registered callbacks on
task completion. One finished worker can therefore satisfy the count while
another remains active, after which close destroys the pool. The executed trace
is direct behavioral evidence; this exact-source mechanism explains it. Sources:
[Piscina index](https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/src/index.ts)
and [worker-pool callbacks](https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/src/worker_pool/base.ts).

**Updated disposition:** a fulfilled close with no timeout error still cannot
certify that every accepted task finished naturally for this multiworker case.
Keep the initial candidate at explicit `minThreads: 1` / `maxThreads: 1` if using
Piscina; even that retains only its tested evidence, not every possible sequence.
Wider closure needs an upstream resolution or a separately demonstrated adapter
strategy. A Host that independently seals admission and observes every accepted
task before closing might avoid this failure; that strategy remains untested.
No silent fork, package patch or hidden private API is selected here.

The later case used the same Node26.11.1, TS7.0.2, Node declarations26.6.5 and
strict source profile, including the explicit `skipLibCheck:true` declaration
caveat. An initial scratch metadata preflight failed because
`piscina/package.json` is not an exported package subpath; its source and exact
error are retained and are not counted as a passing result. The final ordinary
`.ts` fixture records filesystem-observed metadata and its independent
assertions. Its archived README gives exact parent-build and dependency-link
reproduction instructions. No further runtime cases were run.

## Reproduction and primary sources

From the retained experiment directory:

```bash
export PATH=/tmp/plugin-portability-toolchain-20261022/bin:$PATH
node --version
pnpm --version
NODE_USE_ENV_PROXY=1 pnpm install --frozen-lockfile --ignore-scripts
pnpm exec tsc --version
pnpm check
pnpm build
node dist/harness.js
```

The same commands are retained in `reproduce.sh` with fail-fast shell behavior. Registry/network access was run under the environment's required approved network boundary; the initial sandboxed registry attempt failed EPERM and was retried through that boundary. Initial installation used `pnpm install --ignore-scripts`; it completed successfully. Optional package artifacts are recorded in the lock; no package install script was executed. Exact initial metadata and verified tarballs are retained so later moving latest tags are not confused with this evidence.

Primary material retrieved 2026-10-22:

- npm metadata: <https://registry.npmjs.org/piscina>, <https://registry.npmjs.org/workerpool>, <https://registry.npmjs.org/typescript>.
- Piscina pinned close/run implementation and README: <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/src/index.ts>, <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/README.md>. Source-file equality and package version caveat are stated above.
- workerpool exact installed-source pin: <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/src/Pool.js>, <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/src/WorkerHandler.js>, <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/src/Promise.js>, <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/README.md>.
