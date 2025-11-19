# TODO

1. Add support for TurboSync to create/manage multiple different directories. E.g. the default is currently "external" - allow it to be changed while also supporting multiple at once.
2. Make it **optional** to add them to the Turborepo's `packages/*` directory. This means that the git subtree will only be linked to whatever directory TurboSync adds it to. E.g. `turbosync add https://github.com/IonicaBizau/git-package-json` would add it to `external/git-package-json` and NOT `packages/git-package-json`.
