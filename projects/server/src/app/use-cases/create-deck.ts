import { IUseCase } from '../IUseCase';

export interface IUseCaseCreateDeckRequest {
	name: string;
}

export type IUseCaseCreateDeck = IUseCase<IUseCaseCreateDeckRequest, boolean>;

export class UseCaseCreateDeck implements IUseCaseCreateDeck {
    services: IServices;
    constructor(services: IServices) {
        this.services = services;
    }

	async call(request: IUseCaseCreateDeckRequest): Promise<boolean> {
        await 
    }
}
