import { readFileSync } from "node:fs";

import {
  DECLARATION_NAME,
  type Consumer,
  type LocatedDeclaration,
  type SyntheticCandidateProfile,
  validateDeclaration,
  validateSyntheticCandidateProfile,
} from "./model.ts";

export function readFixtureData(
  consumer: Consumer,
  fixtureRoot: URL,
  declarationDirectories: readonly string[],
): Readonly<{ declarations: readonly LocatedDeclaration[]; profile: SyntheticCandidateProfile }> {
  if (new Set(declarationDirectories).size !== declarationDirectories.length) throw new Error("DUPLICATE_PROOF_DECLARATION_DIRECTORY");
  const declarations = [...declarationDirectories]
    .sort()
    .map(directory => {
      if (!/^[a-z][a-z0-9-]*$/u.test(directory)) throw new Error("INVALID_PROOF_DECLARATION_DIRECTORY");
      const declarationPath = `${directory}/${DECLARATION_NAME}`;
      const raw: unknown = JSON.parse(readFileSync(new URL(`${directory}/${DECLARATION_NAME}`, fixtureRoot), "utf8"));
      const result = validateDeclaration(raw, declarationPath, consumer);
      if (result.declaration === undefined) throw new Error(`INVALID_PROOF_DECLARATION:${JSON.stringify(result.diagnostics)}`);
      return Object.freeze({ declarationPath, declaration: result.declaration });
    });
  const rawProfile: unknown = JSON.parse(readFileSync(new URL("profile.json", fixtureRoot), "utf8"));
  const profileResult = validateSyntheticCandidateProfile(rawProfile);
  if (profileResult.profile === undefined || profileResult.profile.consumer !== consumer) {
    throw new Error(`INVALID_PROOF_PROFILE:${JSON.stringify(profileResult.diagnostics)}`);
  }
  return Object.freeze({ declarations: Object.freeze(declarations), profile: profileResult.profile });
}
