import { createMessage, MessageBus } from './MessageBus';

const Database = {
	commandSaveUser: createMessage<string, boolean>('Database/commandSaveUser')
};

async function main() {
	const mb = new MessageBus();

	mb.on(Database.commandSaveUser, (args: string) => {
		console.log(args);

		return true;
	});

	const result = await mb.request(Database.commandSaveUser('Matthew'));

	console.log('Result:', result);
}
main();
