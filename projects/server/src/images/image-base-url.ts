import { Request } from 'express';

export function imageBaseUrl(req: Request): string {
	if (req.baseUrl === '/api' || req.get('x-forwarded-prefix') === '/api') return '/api';
	return `${req.protocol}://${req.get('host')}`;
}
