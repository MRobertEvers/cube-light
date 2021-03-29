import { IDatabase } from '../../database/main/Database';
import { MessageBus } from '../../message/MessageBus';

export interface IServices {
	bus: MessageBus;
}
