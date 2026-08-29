import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  binaryCompare,
  DECLARATION_NAME,
  type Consumer,
  type LocatedDeclaration,
  type StaticProfile,
  validateDeclaration,
  validateStaticProfile,
} from "./model.ts";

export function readFixtureData(
  consumer: Consumer,
  fixtureRoot: URL,
): Readonly<{ declarations: readonly LocatedDeclaration[]; profile: StaticProfile }> {
  const root = fileURLToPath(fixtureRoot);
  const declarations = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .sort((left, right) => binaryCompare(left.name, right.name))
    .map(entry => {
      const declarationPath = `${entry.name}/${DECLARATION_NAME}`;
      const raw: unknown = JSON.parse(readFileSync(new URL(`${entry.name}/${DECLARATION_NAME}`, fixtureRoot), "utf8"));
      const result = validateDeclaration(raw, declarationPath, consumer);
      if (result.declaration === undefined) throw new Error(`INVALID_PROOF_DECLARATION:${JSON.stringify(result.diagnostics)}`);
      return Object.freeze({ declarationPath, declaration: result.declaration });
    });
  const rawProfile: unknown = JSON.parse(readFileSync(new URL("profile.json", fixtureRoot), "utf8"));
  const profileResult = validateStaticProfile(rawProfile);
  if (profileResult.profile === undefined || profileResult.profile.consumer !== consumer) {
    throw new Error(`INVALID_PROOF_PROFILE:${JSON.stringify(profileResult.diagnostics)}`);
  }
  return Object.freeze({ declarations: Object.freeze(declarations), profile: profileResult.profile });
}
