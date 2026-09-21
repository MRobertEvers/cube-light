const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const configPath = path.join(root, 'build/config.gypi');
const config = JSON.parse(
	fs.readFileSync(configPath, 'utf8').replace(/^#.*\n/, '')
);
const nodeDir = config.variables.nodedir;
const nodeInclude = path.join(nodeDir, 'include/node');

if (!fs.existsSync(path.join(nodeInclude, 'node_api.h'))) {
	throw new Error(`Node-API headers not found in ${nodeInclude}`);
}

const { targets } = JSON.parse(
	fs.readFileSync(path.join(root, 'binding.gyp'), 'utf8')
);
const commands = targets.flatMap((target) =>
	target.sources
		.filter((source) => source.endsWith('.c'))
		.map((source) => {
			const file = path.join(root, source);
			return {
				directory: root,
				file,
				arguments: [
					'clang',
					'-std=c11',
					`-DNODE_GYP_MODULE_NAME=${target.target_name}`,
					'-DBUILDING_NODE_EXTENSION',
					`-I${nodeInclude}`,
					'-c',
					file
				]
			};
		})
);

fs.writeFileSync(
	path.join(root, 'compile_commands.json'),
	JSON.stringify(commands, null, 2) + '\n'
);
