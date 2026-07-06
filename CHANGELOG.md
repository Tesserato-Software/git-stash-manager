# Changelog

All notable changes to the **Git Stash Manager** extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-06

### Added

- Initial release.
- Command **Git Stash Manager: Open** to launch the stash inspector.
- List all stashes in the current workspace with reference, branch, and message.
- Inspect a stash's changed files (`git stash show <ref> --stat`).
- Preview the full diff in **Split** (side-by-side) and **Unified** views, with
  collapsible files and large-file guards.
- Refresh, filter, and loading/empty/error states.

Read-only and safe: this version never applies, pops, drops, or otherwise
mutates Git state.
