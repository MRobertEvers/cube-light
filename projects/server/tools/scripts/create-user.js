// Adds an account: `npm run create-user -- <username>`, then type the password.
// The first account can instead be created from the client's sign-in screen.
const path = require('node:path');
const readline = require('node:readline');

const root = path.resolve(__dirname, '../..');
const { UserStore, USERNAME } = require(
	path.join(root, 'build/src/auth/UserStore')
);
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

async function main() {
	const username = (process.argv[2] || '').trim();
	if (!USERNAME.test(username)) {
		throw new Error(
			'Usage: npm run create-user -- <username> (3 to 64 letters, digits, or . _ - @)'
		);
	}
	const password = await askHidden(`Password for ${username}: `);
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(
			`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
		);
	}
	if ((await askHidden('Repeat password: ')) !== password) {
		throw new Error('The passwords did not match.');
	}
	const users = await UserStore.Sqlite(path.join(root, 'database.sqlite'));
	try {
		const id = await users.create(username, await hashPassword(password));
		if (id === null) throw new Error(`The username ${username} is taken.`);
		console.log(`Created ${username}.`);
	} finally {
		await users.close();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
