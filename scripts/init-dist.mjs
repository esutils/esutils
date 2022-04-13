import fs from 'fs/promises';

/* Write package.json for mjs and cjs folder */
async function writeModuleConfig() {
  let err;
  try {
    await fs.mkdir('dist/cjs', { recursive: true });
  } catch (error) {
    err = error;
  }
  try {
    await fs.mkdir('dist/mjs', { recursive: true });
  } catch (error) {
    err = error;
  }

  try {
    await fs.access('dist/cjs/package.json');
  } catch (e_access) {
    try {
      await fs.writeFile('dist/cjs/package.json', '{"type": "commonjs"}\n');
    } catch (e_write) {
      err = e_write;
    }
  }

  try {
    await fs.access('dist/mjs/package.json');
  } catch (e_access) {
    try {
      await fs.writeFile('dist/mjs/package.json', '{"type": "module"}\n');
    } catch (e_write) {
      err = e_write;
    }
  }

  return err;
}

writeModuleConfig();
