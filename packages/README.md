# Packages

This directory is closed until an accepted package-specific ADR and a real
feature-owned implementation slice admit a package through
`architecture/package-catalog.json`. Admission also requires a versioned
`architecture/package-admissions/<encoded-package-id>.json` record proving one
of the package bases preserved by ADR-0013: an independent deployment or isolation
boundary, an independent replacement or release lifecycle, a public SPI with
two implementations, or two independent consumers. Evidence uses exact source
commits, passed conformance, canonical locations, and distinct digests. URL
aliases or mirrors of the same bytes do not count twice. Publication additionally
resolves stable provider repository IDs and verifies the referenced evidence
bytes; a repository slug alone cannot prove consumer independence. Package
admission does not transfer module semantic ownership to Foundation; that
separate extraction requires two independently authored consumers,
cross-consumer conformance, and an accepted extraction decision.

Do not add placeholder packages or empty DDD layers. Use the deterministic
scaffolding plan, review, apply, and recovery workflow documented in the
architecture overview.
