import { Router } from 'express';
import { MessageBus } from '../../message/MessageBus';

export function createV2Routes(context: MessageBus) {
	const router = Router();

	return router;
}
