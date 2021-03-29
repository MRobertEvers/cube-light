import { MessageBus } from '../../message/MessageBus';
import { IServices } from './IServices';

export class Services implements IServices {
	bus: MessageBus;

	constructor(bus: MessageBus) {
		this.bus = bus;
	}
}
