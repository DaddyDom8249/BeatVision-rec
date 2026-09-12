# BeatVision-rec

Unified BeatVision integration repository.

This repository combines the current BeatVision codebases without modifying their source repositories. Each source repository is pinned as an immutable git submodule at the exact commit used for this integration snapshot.

## Included source repositories

- BeatVision
- BeatVision-arena
- BeatVision-recovery
- BeatVision-Test

The integration layer at the root provides a single project entry point while preserving each source repository independently.

## Principle

Source repositories remain untouched. Integration changes belong only in BeatVision-rec.
