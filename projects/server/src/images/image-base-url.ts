import { Request } from 'express';

export function imageBaseUrl(req: Request): string {
	return `${req.protocol}://${req.get('host')}`;
}
