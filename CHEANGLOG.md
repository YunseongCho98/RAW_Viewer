# CHEANGLOG

All notable changes to this project are documented in this file.

## [0.1.1] - 2026-03-06

### Fixed
- Fixed `Fit to view` shrinking repeatedly when adjusting `Level` or `Window (Width)` sliders.
- Updated fit-zoom height calculation to use viewport-available space, preventing cumulative scale reduction on re-render.

### Packaging
- Repackaged extension with `vsce` and published as `raw-viewer-0.1.1.vsix`.
- Verified package includes `extension.vsixmanifest`.

## [0.1.0] - 2026-03-06

### Added
- Initial Marketplace release of RAW Viewer custom editor for `*.raw` files.
- 16-bit RAW loading with user-provided width/height.
- Auto/manual window level controls (`Level`, `Window`).
- Pixel value inspection on mouse hover.
- Display size controls including percent zoom and `Fit to view` mode.
