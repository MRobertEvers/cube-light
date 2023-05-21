import { Response } from 'express';

export function expressNotFound(res: Response): void {
	res.sendStatus(404);
}
