import { Response } from 'express';

export function expressBadRequest(res: Response): void {
	res.sendStatus(400);
}
