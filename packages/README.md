# Packages

This directory is closed until an accepted package-specific ADR and a real
feature-owned implementation slice admit a package through
`architecture/package-catalog.json`. Admission also requires a versioned
`architecture/package-admissions/<encoded-package-id>.json` record with two
independent consumer repositories, exact source commits, passed conformance,
and distinct digest-bearing evidence references. Publication additionally
resolves stable provider repository IDs and verifies the referenced evidence
bytes; a repository slug alone cannot prove consumer independence.

Do not add placeholder packages or empty DDD layers. Use the deterministic
scaffolding plan, review, apply, and recovery workflow documented in the
architecture overview.
