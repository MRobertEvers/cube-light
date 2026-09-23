import type { AuthUser } from '../../domain/models/session';

export type SessionState =
	| { status: 'loading' }
	| { status: 'unreachable' }
	| { status: 'signed-out'; setupRequired: boolean }
	/** `expired`: the server stopped accepting the session while the app was open. */
	| {
			status: 'signed-in';
			user: AuthUser;
			expired: boolean;
			/** Counts sign-ins, so a page that failed while signed out mounts afresh. */
			epoch: number;
	  };
