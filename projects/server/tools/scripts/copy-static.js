const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * @param {string} root
 */
async function copyStatic(root) {
	const sourceAssets = path.join(root, 'src/assets');
	const targetAssets = path.join(root, 'build/src/assets');
	const targetPublic = path.join(root, 'build/src/public');

	await Promise.all([
		fs.mkdir(targetAssets, { recursive: true }),
		fs.mkdir(targetPublic, { recursive: true })
	]);

	const source = await fs.realpath(
		path.join(sourceAssets, 'AllPrintings.sqlite')
	);
	const target = path.join(targetAssets, 'AllPrintings.sqlite');
	await fs.rm(target, { force: true });
	await fs.symlink(source, target);

	// The offline card pack and card art pack, when refresh-mtgjson.py and card-images.py have built them.
	for (const name of ['CardPack.json.gz', 'CardPack.info.json', 'card-art']) {
		const packTarget = path.join(targetAssets, name);
		await fs.rm(packTarget, { force: true });
		const packSource = await fs.realpath(path.join(sourceAssets, name)).catch(() => null);
		if (packSource) await fs.symlink(packSource, packTarget);
	}
}

if (require.main === module) {
	copyStatic(path.resolve(__dirname, '../..')).catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { copyStatic };
