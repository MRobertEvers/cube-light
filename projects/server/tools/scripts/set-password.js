// Changes an account's password: `npm run set-password -- <username>`, then type the
// new password. Saves a copy of the database first, as database.sqlite.bak-<time>.
// The running server needs no restart: it reads the hash at each sign-in.
const path = require('node:path');
const readline = require('node:readline');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '../..');
const { UserStore } = require(path.join(root, 'build/src/auth/UserStore'));
const { hashPassword, MIN_PASSWORD_LENGTH } = require(
	path.join(root, 'build/src/auth/passwords')
);

/**
 * @param {string} question
 */
function askHidden(question) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true
		});
		rl.question(question, (answer) => {
			rl.close();
			process.stdout.write('\n');
			resolve(answer);
		});
		// Echo nothing while the password is typed.
		rl._writeToOutput = function () {};
	});
}

/**
 * Copies the database with VACUUM INTO, which is safe while the server has it open.
 * @param {string} databasePath
 * @returns {string} the backup's path
 */
function backUp(databasePath) {
	const stamp = new Date()
		.toISOString()
		.replace(/[-:]/g, '')
		.replace('T', '-')
		.slice(0, 15);
	const backupPath = `${databasePath}.bak-${stamp}`;
	const database = new DatabaseSync(databasePath);
	try {
		database.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
	} finally {
		database.close();
	}
	return backupPath;
}

async function main() {
	const username = (process.argv[2] || '').trim();
	if (!username) {
		throw new Error('Usage: npm run set-password -- <username>');
	}
	const databasePath = path.join(root, 'database.sqlite');
	const users = await UserStore.Sqlite(databasePath);
	try {
		const user = await users.findByUsername(username);
		if (!user) throw new Error(`There is no account named ${username}.`);
		const password = await askHidden(`New password for ${user.Username}: `);
		if (password.length < MIN_PASSWORD_LENGTH) {
			throw new Error(
				`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
			);
		}
		if ((await askHidden('Repeat password: ')) !== password) {
			throw new Error('The passwords did not match.');
		}
		console.log(`Backed up to ${backUp(databasePath)}.`);
		if (!(await users.setPassword(user.UserId, await hashPassword(password)))) {
			throw new Error(`The account ${user.Username} could not be updated.`);
		}
		console.log(`Changed the password for ${user.Username}.`);
	} finally {
		await users.close();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
