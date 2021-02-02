import * as Sequelize from 'sequelize';
import { DeckCard } from './deck-card';

export class Deck extends Sequelize.Model {
	public DeckId!: number;
	public Name!: string;
	public Art?: string;

	public UpdatedAt!: Date;

	// This is the table name of deck-card
	public readonly Deck_Cards?: DeckCard[];
}

const TABLE_NAME = 'Deck';
export function DefineDeckModel(database: Sequelize.Sequelize): typeof Deck {
	const Model = <typeof Deck>database.define(
		TABLE_NAME,
		{
			DeckId: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true
			},
			Name: {
				type: Sequelize.STRING(1024)
			},
			Art: {
				type: Sequelize.STRING(1024)
			}
		},
		{
			createdAt: 'CreatedAt',
			updatedAt: 'UpdatedAt'
		}
	);

	return Model;
}
