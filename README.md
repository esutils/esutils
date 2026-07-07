# esutils

TypeScript utility packages published under `@esutils/*`. This repo is a Yarn 4
workspace monorepo.

## Install

Linux (Node.js 26 via NodeSource):

```bash
curl -sL https://deb.nodesource.com/setup_26.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt-get install -y nodejs
```

Windows (Corepack + project dependencies):

```bat
npm install -g corepack --force
corepack enable
yarn
```

This project pins `"packageManager": "yarn@4.17.0"` in `package.json`. Corepack
installs and runs that Yarn version automatically; do not rely on global Yarn
1.x.

### Safe yarn install

If `yarn build` fails with `Cannot find module '@esutils/...'`, workspace symlinks
under `node_modules/@esutils/` may be broken (empty folders instead of links to
`packages/*`). The repo uses [`rimraf`](https://www.npmjs.com/package/rimraf) as a
devDependency so removal works the same on Windows, Linux, and macOS (no global
install needed):

```shell
yarn install:safe
```

That runs `yarn rmdir:esutils`, then `yarn install`, then `yarn build`.

To remove only the broken links:

```shell
yarn rmdir:esutils
yarn install
```

Verify links: each `node_modules/@esutils/<name>` entry should point at
`packages/<name>` and contain a `package.json` (for example
`node_modules/@esutils/invert/package.json`).

## Scripts

From the repo root:

```bat
yarn build
yarn test
yarn lint
yarn watch
```

- `build` - compile all workspace packages with `tsc --build`
- `install:safe` - remove broken `node_modules/@esutils` links, reinstall, build
- `test` - build, then run Jest across the monorepo
- `lint` - TypeScript project check via Vite and `vite-plugin-checker`
- `watch` - incremental TypeScript rebuild

Build a single workspace:

```bat
yarn workspace @esutils/deferred run build
```

## New package

Packages live under `packages/*`, use `"type": "module"`, compile `.mts` sources
from `src/` to `dist/`, and expose ESM entry points (`main`, `types`).

Typical steps:

1. Create `packages/<name>/` with `package.json`, `tsconfig.mjs.json`, `src/`,
   and tests. Use an existing package such as `@esutils/deferred` as a template.
2. Add the new `tsconfig.mjs.json` to root `tsconfig.mjs.json` references.
3. Run `yarn build` and `yarn test`.

Root `devDependencies` already provide TypeScript, Jest, Vite, and related
tooling for all workspaces.

## Publish package

```bat
cd packages/deferred
yarn run build
npm publish --access public
```

Some packages have extra release steps. For example, `@esutils/dns-packet` also
runs `yarn run pack` to produce `dist-vite/dns-proxy.cjs`. To run the TypeScript
source during development:

```bash
node --import=tsx packages/dns-packet/examples/dns-proxy.ts --help
```

See [packages/dns-packet/README.md](packages/dns-packet/README.md).
