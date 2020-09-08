import express, { Request, Response } from 'express';
import * as Sequelize from 'sequelize';

const database = new Sequelize.Sequelize({
	dialect: 'sqlite',
	storage: 'database.sqlite'
});

const Model = database.define('deck_tmp', {
	DeckId: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		allowNull: false,
		autoIncrement: true
	},
	Cards: {
		type: Sequelize.STRING(1024)
	}
});
Model.sync({ force: true });

const app = express();

app.get('/', async (req: Request, res: Response) => {
	const [item] = await Model.upsert(
		{
			Cards: 'Shark Typhoon'
		},
		{
			returning: true
		}
	);

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Content-Type', 'application/json');
	res.send(JSON.stringify(item));
});

const PORT = 4040;
app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
