import http from 'node:http';

// Every TLS connection opens with a handshake record, whose first byte is 22.
const TLS_HANDSHAKE = 22;

/**
 * Lets an HTTPS server also answer plain HTTP on the same port. The first byte of
 * each connection tells the two apart: a TLS handshake goes on to the server's own
 * TLS handling, and anything else is parsed as HTTP and handed to the server's
 * request and upgrade listeners, so pages and the HMR socket behave the same.
 * @param {import('node:net').Server} server A listening or not-yet-listening TLS server.
 */
export function acceptPlainHttp(server) {
	const tlsListeners = server.listeners('connection');
	server.removeAllListeners('connection');
	const plain = http.createServer();
	plain.on('request', function (req, res) {
		server.emit('request', req, res);
	});
	plain.on('upgrade', function (req, socket, head) {
		server.emit('upgrade', req, socket, head);
	});
	server.on('connection', function (socket) {
		socket.once('data', function (chunk) {
			socket.pause();
			socket.unshift(chunk);
			if (chunk[0] === TLS_HANDSHAKE) {
				for (const listener of tlsListeners) listener.call(server, socket);
			} else {
				plain.emit('connection', socket);
			}
			process.nextTick(function () {
				socket.resume();
			});
		});
	});
}
