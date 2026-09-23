import type { ToriMTG } from '../core/types';
import type { AuthUser, PrintingView, UserProfile } from '../../domain/models/session';

/** The signed-in user's own settings, synced like any other data. */
export class ProfileApi {
	private readonly tori: ToriMTG;

	constructor(tori: ToriMTG) {
		this.tori = tori;
	}

	/** Saves the profile artwork and returns the user as it now appears. */
	async setArtwork(profile: UserProfile): Promise<AuthUser> {
		const user = await this.signedInUser();
		await this.tori.commands.execute({
			type: 'profile.artwork',
			id: `profile_${user.id}`,
			userId: user.id,
			profile
		});
		const saved = await this.tori.queries.read<{ profile: UserProfile | null }>({
			type: 'profile'
		});
		return { ...user, profile: saved.data?.profile || null } as AuthUser;
	}

	/** The saved printing view, or null before one is saved. */
	async printingView(): Promise<PrintingView | null> {
		const saved = await this.tori.queries.read<{ printingView: PrintingView }>({
			type: 'profile'
		});
		return saved.data?.printingView ?? null;
	}

	async setPrintingView(printingView: PrintingView): Promise<void> {
		const user = await this.signedInUser();
		await this.tori.commands.execute({
			type: 'profile.printingView',
			id: `profile_${user.id}`,
			userId: user.id,
			printingView
		});
	}

	private async signedInUser() {
		const user = (await this.tori.session()).user;
		if (!user) throw new Error('Sign in required');
		return user;
	}
}
