# AstylarUI AI text-to-speech demo

This standalone Angular application is a package-boundary consumer of AstylarUI. It renders one responsive application surface from `SiteData` and imports the library only from the documented `astylarui` package root.

The checked-in project intentionally does not contain `astylarui.tgz`, generated audio, API keys, or installed dependencies. The repository verification workflow builds and packs the library, installs that tarball into a temporary copy of this app, and then builds and tests the copy.

The complete mock and live-development instructions will be added as the text-to-speech workflow is implemented.
