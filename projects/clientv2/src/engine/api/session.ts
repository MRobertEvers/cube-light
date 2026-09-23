import type { ToriMTG } from '../core/types';
import type { AuthUser, SessionInfo } from '../../domain/models/session';

/**
 * Signing in and out. The sync host holds the server-issued bearer tokens; this only
 * ever sees public user information. An ended session arrives as a session-expired event.
 */
export class SessionApi {
	private readonly tori: ToriMTG;

	constructor(tori: ToriMTG) {
		this.tori = tori;
	}

	/** The saved session, answered without waiting for the server when one exists. */
	current(): Promise<SessionInfo> {
		return this.tori.session() as Promise<SessionInfo>;
	}

	async signIn(username: string, password: string): Promise<AuthUser> {
		return (await this.tori.signIn(username, password, false)) as AuthUser;
	}

	/** Creates the server's first account and signs in to it. */
	async createFirstAccount(username: string, password: string): Promise<AuthUser> {
		return (await this.tori.signIn(username, password, true)) as AuthUser;
	}

	async signOut(): Promise<void> {
		await this.tori.signOut();
	}
}
