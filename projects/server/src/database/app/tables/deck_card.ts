import * as Sequelize from 'sequelize';
import { Deck } from './deck';

export class DeckCard extends Sequelize.Model {
	public DeckCardId!: number;
	public DeckId!: number;
	public Uuid!: string;
	public Count!: number;
}

export const TABLE_NAME = 'Deck_Card';
export function DefineDeckCardModel(
	database: Sequelize.Sequelize,
	deckTable: typeof Deck
): typeof DeckCard {
	const Model = <typeof DeckCard>database.define(
		TABLE_NAME,
		{
			DeckCardId: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true
			},
			DeckId: {
				type: Sequelize.STRING(1024)
			},
			Uuid: {
				type: Sequelize.STRING(128)
			},
			Count: {
				type: Sequelize.INTEGER,
				defaultValue: 1
			}
		},
		{
			timestamps: false
		}
	);

	deckTable.hasMany(Model, {
		foreignKey: 'DeckId',
		onDelete: 'CASCADE'
	});

	return Model;
}
