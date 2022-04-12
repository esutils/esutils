
# Install

```bat
npm i -G yarn
```

# New package

```bat
yarn init
yarn add -D typescript ts-node ts-jest @types/node @types/jest
yarn run tsc --init
```

# Install eslint support package

```bat
yarn add -W -D eslint-config-airbnb eslint
yarn add -W -D eslint-plugin-jsx-a11y eslint-plugin-import eslint-plugin-react eslint-plugin-react-hooks
yarn add -W -D eslint-config-airbnb-typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

# Publish package

```bat
cd packages/deferred
npm publish --access public
```
