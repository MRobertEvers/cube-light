import type { BoardGroups } from '../../domain/deck/grouping';
import type {
	CollectionDetail,
	CollectionSummaries,
	LocationDetail,
	Ownership,
	StorageLocationSummaries
} from '../../domain/models/library';

/** A collection with its cards grouped by type, the way boards draw them. */
export type GroupedCollection = CollectionDetail & { board: BoardGroups };

/** A storage location with its cards grouped by type, the way boards draw them. */
export type GroupedLocation = LocationDetail & { board: BoardGroups };

export type LibraryState = {
	/** Null until the library has been read. */
	collections: CollectionSummaries | null;
	locations: StorageLocationSummaries | null;
	ownership: Ownership | null;
	revision: number;
	error: string | null;
	collectionsById: Record<string, GroupedCollection>;
	collectionRevisions: Record<string, number>;
	collectionErrors: Record<string, string>;
	locationsById: Record<string, GroupedLocation>;
	locationRevisions: Record<string, number>;
	locationErrors: Record<string, string>;
};
