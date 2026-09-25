import { Router, json } from 'express';
import type { Request, Response } from 'express';
import type { CommandRequest, Json } from '@torimtg/core';
import { CARD_CATALOG_VERSION, DomainError } from '@torimtg/core';
import { currentSession } from '../auth/middleware';
import { SyncRepository } from './repository';
import { CardDatabase } from '../database/cards/CardDatabase';
import { getDeckOverviewCardInfo } from '../app/get-deck-overview-card-info';
import { imageBaseUrl } from '../images/image-base-url';

export function createSyncRoutes(repository: SyncRepository, cards: CardDatabase): Router {
    const router = Router();
    router.use('/sync/v1', json({ limit: '2mb' }));
    router.use('/sync/v1', (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        if (!currentSession(res)) { res.status(401).json({ error: 'Sign in required' }); return; }
        next();
    });
    router.post('/sync/v1/commands', async (req, res) => {
        try {
            const request = req.body as CommandRequest;
            const command = request?.command;
            if (!command || typeof command.type !== 'string' || typeof command.id !== 'string') throw new DomainError('Invalid command.');
            const uuids = command.type === 'deck.cards' || command.type === 'collection.cards' || command.type === 'work.complete' ? command.edits?.map((edit) => edit.uuid) : command.type === 'deck.details' && command.bannerCardUuid ? [command.bannerCardUuid] : [];
            if (!Array.isArray(uuids) || uuids.length > 2000) throw new DomainError('Invalid card batch.');
            const unique = Array.from(new Set(uuids));
            if (unique.length && (await cards.queryCardInfo(unique)).length !== unique.length) throw new DomainError('Unknown card printing. Download card details before adding it.');
            res.json(repository.commit(request, currentSession(res)!.userId));
        } catch (error) { respondError(res, error); }
    });
    router.post('/sync/v1/changes', async (req, res) => page(req, res, false));
    router.post('/sync/v1/bootstrap', async (req, res) => page(req, res, true));
    async function page(req: Request, res: Response, bootstrap: boolean): Promise<void> {
        try {
            const body = req.body;
            if (!body || body.protocolVersion !== 1 || body.serverInstanceId !== repository.serverInstanceId || body.accountId !== currentSession(res)!.userId || !Number.isSafeInteger(body.cursor) || body.cursor < 0 || !Array.isArray(body.operationIds) || body.operationIds.length > 500 || !body.operationIds.every((id: unknown) => typeof id === 'string')) throw new DomainError('Invalid replication request.');
            if (bootstrap && (typeof body.after !== 'string' || !Number.isSafeInteger(body.watermark) || body.watermark < 0)) throw new DomainError('Invalid bootstrap cursor.');
            const result = repository.readPage(body.accountId, body.cursor, body.operationIds, bootstrap ? { after: body.after, watermark: body.watermark } : undefined);
            const uuids = new Set<string>();
            for (const replica of result.replicas.concat(result.outcomes.flatMap((outcome) => outcome.replicas))) if (replica.state.kind === 'deck') {
                for (const uuid of Object.keys(replica.state.cards).concat(Object.keys(replica.state.sideboard || {}))) uuids.add(uuid);
                if (replica.state.bannerCardUuid) uuids.add(replica.state.bannerCardUuid);
            } else if (replica.state.kind === 'collection') {
                for (const uuid of Object.keys(replica.state.cards || {})) uuids.add(uuid);
            }
            const catalog: Record<string, Json> = {};
            const ids = Array.from(uuids);
            for (let start = 0; start < ids.length; start += 500) {
                const found = await cards.queryCardInfo(ids.slice(start, start + 500));
                for (const card of await getDeckOverviewCardInfo(found.map((item) => item.uuid), cards, imageBaseUrl(req))) catalog[card.uuid] = JSON.parse(JSON.stringify(card));
            }
            res.json({ protocolVersion: 1, serverInstanceId: repository.serverInstanceId, replicas: result.replicas, outcomes: result.outcomes, cursor: result.cursor, hasMore: result.hasMore, after: result.after, watermark: result.watermark, catalog, catalogVersion: CARD_CATALOG_VERSION, bootstrapComplete: bootstrap ? !result.hasMore : undefined });
        } catch (error) { respondError(res, error); }
    }
    router.get('/sync/v1/resolve-card', async (req, res) => {
        const name = req.query.name;
        const setCode = req.query.setCode;
        if (typeof name !== 'string' || name.length > 1024 || (setCode !== undefined && typeof setCode !== 'string')) { res.sendStatus(400); return; }
        const printings = await cards.queryCardsByName(name);
        const selected = (setCode ? printings.find((card) => card.setCode.toLowerCase() === setCode.toLowerCase()) : printings[0]);
        if (!selected) { res.status(404).json({ error: `Unknown card: ${name}` }); return; }
        const [card] = await getDeckOverviewCardInfo([selected.uuid], cards, imageBaseUrl(req));
        res.json(card);
    });
    router.get('/sync/v1/history/:id', (req, res) => {
        if (!/^deck_[A-Za-z0-9_-]{16}$/.test(String(req.params.id))) { res.sendStatus(400); return; }
        res.json({ events: repository.history(String(req.params.id)), legacy: repository.legacyHistory(String(req.params.id)) });
    });
    router.post('/sync/v1/blobs/:id/chunks', async (req, res) => {
        try {
            const body = req.body;
            if (!body || body.accountId !== currentSession(res)!.userId || typeof body.data !== 'string') throw new DomainError('Invalid upload identity.');
            const received = await repository.putChunk(String(req.params.id), body.offset, body.total, body.contentType, Buffer.from(body.data, 'base64'));
            res.json({ received });
        } catch (error) { respondError(res, error); }
    });
    router.get('/sync/v1/blobs/:id', async (req, res) => {
        const blob = await repository.blob(String(req.params.id));
        if (!blob) { res.sendStatus(404); return; }
        res.setHeader('Content-Type', blob.ContentType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.send(Buffer.from(blob.Data));
    });
    return router;
}

function respondError(res: Response, error: unknown): void {
    if (error instanceof DomainError) res.status(400).json({ error: error.message });
    else { console.error('Sync request failed', error); res.status(500).json({ error: 'Sync could not complete. Your local changes remain queued.' }); }
}
