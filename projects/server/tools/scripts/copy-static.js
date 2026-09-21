const fs = require('node:fs/promises');
const path = require('node:path');

async function copyStatic(root) {
	const sourceAssets = path.join(root, 'src/assets');
	const targetAssets = path.join(root, 'build/src/assets');
	const targetPublic = path.join(root, 'build/src/public');

	await Promise.all([
		fs.mkdir(targetAssets, { recursive: true }),
		fs.mkdir(targetPublic, { recursive: true })
	]);

	await fs.copyFile(
		path.join(sourceAssets, 'AllPrintings.sqlite'),
		path.join(targetAssets, 'AllPrintings.sqlite')
	);
}

if (require.main === module) {
	copyStatic(path.resolve(__dirname, '../..')).catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

module.exports = { copyStatic };
