import { createMessage, MessageBus } from '../message/MessageBus';
import { IUseCase } from './IUseCase';
import { IServices } from './services/IServices';
import { IUseCaseCreateDeckRequest, UseCaseCreateDeck } from './use-cases/create-deck';

export const ApplicationUseCases = {
	commandCreateDeck: createMessage<IUseCaseCreateDeckRequest, { deckId: number }>(
		'ApplicationUseCases/commandCreateDeck'
	)
};

function handle<T, R>(useCase: IUseCase<T, R>): (args: T) => Promise<R> {
	return async (args: T) => {
		return useCase.call(args);
	};
}

export function createApplication(services: IServices) {
	const { bus } = services;

	bus.on(ApplicationUseCases.commandCreateDeck, handle(new UseCaseCreateDeck(services)));
}
