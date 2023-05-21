import * as Sequelize from 'sequelize';
import { CollectionCard } from './collection_card';

export class Collection extends Sequelize.Model {
	public CollectionId!: number;
	public Name!: string;

	// This is the table name of deck-card
	public readonly Collection_Cards?: CollectionCard[];
}

const TABLE_NAME = 'Collection';
export function DefineCollectionModel(database: Sequelize.Sequelize): typeof Collection {
	const Model = <typeof Collection>database.define(
		TABLE_NAME,
		{
			CollectionId: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true
			},
			Name: {
				type: Sequelize.STRING(1024),
				allowNull: false
			}
		},
		{
			createdAt: 'CreatedAt',
			updatedAt: 'UpdatedAt'
		}
	);

	return Model;
}
