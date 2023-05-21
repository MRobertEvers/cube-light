import * as Sequelize from 'sequelize';

export class StorageLocation extends Sequelize.Model {
	public StorageLocationId!: number;
	public Name!: string;
}

const TABLE_NAME = 'StorageLocation';
export function DefineStorageLocationModel(database: Sequelize.Sequelize): typeof StorageLocation {
	const Model = <typeof StorageLocation>database.define(
		TABLE_NAME,
		{
			StorageLocationId: {
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
