import type { ToriMTG } from '../core/types';
import type { LocalReader } from '../core/local-reader';
import { newId } from '../../domain/ids';
import type {
	CollectionSummaries,
	StorageLocationSummaries
} from '../../domain/models/library';

/** Collections and the storage locations their cards are kept in. */
export class LibraryApi {
	private readonly tori: ToriMTG;
	private readonly reader: LocalReader;

	constructor(tori: ToriMTG, reader: LocalReader) {
		this.tori = tori;
		this.reader = reader;
	}

	collections(): Promise<CollectionSummaries> {
		return this.reader.value<CollectionSummaries>({ type: 'collections' });
	}

	storageLocations(): Promise<StorageLocationSummaries> {
		return this.reader.value<StorageLocationSummaries>({ type: 'locations' });
	}

	/** Returns the new collection's id. */
	async createCollection(name: string): Promise<string> {
		const id = newId('collection');
		await this.tori.commands.execute({ type: 'collection.create', id, name });
		return id;
	}

	/** Returns the new storage location's id. */
	async createStorageLocation(name: string): Promise<string> {
		const id = newId('location');
		await this.tori.commands.execute({ type: 'location.create', id, name });
		return id;
	}
}
