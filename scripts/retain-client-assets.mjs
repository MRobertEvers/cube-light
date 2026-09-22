import { readdir, mkdir, copyFile, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Publish immutable build files without overwriting an older file at the same URL.
 * Only dist/assets is retained; HTML and unversioned models stay release-specific.
 * @param {{source: string, destination: string}} options
 */
export async function retainClientAssets(options) {
  const { source, destination } = options;
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await retainClientAssets({ source: from, destination: to });
    } else if (entry.isFile()) {
      try {
        await copyFile(from, to, constants.COPYFILE_EXCL);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const sourceHash = createHash('sha256').update(await readFile(from)).digest('hex');
        const retainedHash = createHash('sha256').update(await readFile(to)).digest('hex');
        if (sourceHash !== retainedHash) {
          throw Error(`Refusing to change immutable asset contents: ${entry.name}`);
        }
      }
    } else {
      throw Error(`Build assets must be regular files: ${from}`);
    }
  }
}
