const { spawn } = require('node:child_process');

const children = [];
let stopping = false;

/**
 * @param {NodeJS.Signals} [signalArg]
 */
function stopChildren(signalArg) {
	const signal = signalArg === undefined ? 'SIGTERM' : signalArg;

	if (stopping) return;
	stopping = true;
	for (const child of children) child.kill(signal);
}

/**
 * @param {string} name
 * @param {string[]} args
 */
function start(name, args) {
	const child = spawn(process.execPath, args, { stdio: 'inherit' });
	children.push(child);
	child.on('error', (error) => {
		console.error(`${name} failed to start:`, error);
		process.exitCode = 1;
		stopChildren();
	});
	child.on('exit', (code, signal) => {
		if (stopping) return;
		console.error(
			`${name} exited (${signal || code}); stopping dev server.`
		);
		process.exitCode = code || 1;
		stopChildren();
	});
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		process.exitCode = signal === 'SIGINT' ? 130 : 143;
		stopChildren(signal);
	});
}

start('TypeScript watcher', [
	require.resolve('typescript/bin/tsc'),
	'--watch',
	'--preserveWatchOutput'
]);
start('Node watcher', ['--enable-source-maps', '--watch', 'build/src/main.js']);
