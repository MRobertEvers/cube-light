import * as Sequelize from 'sequelize';
import { Collection } from './collection';
import { StorageLocation } from './storage-location';

export class CollectionCard extends Sequelize.Model {
	public CollectionCardId!: number;
	public StorageLocationId!: number;
	public CollectionId!: number;
	public Uuid!: string;
	public Count!: number;
}

export const TABLE_NAME = 'Collection_Card';
export function DefineCollectionCardModel(
	database: Sequelize.Sequelize,
	collectionTable: typeof Collection,
	locationTable: typeof StorageLocation,
): typeof CollectionCard {
	const Model = <typeof CollectionCard>database.define(
		TABLE_NAME,
		{
			CollectionCardId: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true
			},
			StorageLocationId: {
				type: Sequelize.INTEGER
			},
			CollectionId: {
				type: Sequelize.INTEGER
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
			createdAt: 'CreatedAt',
			updatedAt: 'UpdatedAt'
		}
	);

	collectionTable.hasMany(Model, {
		foreignKey: 'CollectionId',
		onDelete: 'CASCADE'
	});

	locationTable.hasMany(Model, {
		foreignKey: 'StorageLocationId',
		onDelete: 'CASCADE'
	});

	return Model;
}
