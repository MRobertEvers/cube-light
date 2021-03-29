import { IUseCase } from '../IUseCase';
import { IServices } from '../services/IServices';

export interface IUseCaseCreateDeckRequest {
	name: string;
}

export type IUseCaseCreateDeck = IUseCase<IUseCaseCreateDeckRequest, { deckId: number }>;

export class UseCaseCreateDeck implements IUseCaseCreateDeck {
	services: IServices;

	get ctx() {
		return this.services.bus;
	}

	constructor(services: IServices) {
		this.services = services;
	}

	async call(request: IUseCaseCreateDeckRequest): Promise<{ deckId: number }> {
		const { name } = request;

		const ctx = this.ctx;
	}
}
