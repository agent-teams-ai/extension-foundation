import type { ImportExpression, Program } from "oxc-parser";

export interface SourceAnalysis {
  readonly dynamicModuleImports: readonly ImportExpression[];
  readonly program: Program | undefined;
  readonly errors: readonly string[];
  readonly hasExecutableCode: boolean;
  readonly hasRuntimeImplementation: boolean;
  readonly exportedRuntimeImplementationNames: readonly string[];
  readonly localRuntimeExportNames: readonly string[];
  readonly localRuntimeExportBindings: readonly {
    readonly exportedName: string;
    readonly localName: string;
  }[];
  readonly hasTestRegistration: boolean;
  readonly observedRuntimeImportSources: readonly string[];
  readonly staticModuleDependencies: readonly {
    readonly kind: "import" | "export";
    readonly specifier: string;
    readonly exportAll?: boolean;
    readonly exportedName?: string | undefined;
    readonly importedName?: string | undefined;
    readonly syntheticBinding?: boolean;
  }[];
}

export function analyzeSource(filename: string, source: string): SourceAnalysis;
