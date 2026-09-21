const WorkerPlugin = require('worker-plugin');
module.exports = {
	webpack(config, context) {
		const { isServer } = context;
		if (!isServer) {
			config.plugins.push(
				new WorkerPlugin({
					globalObject: 'self'
				})
			);
		}

		config.module.rules.push({
			test: /.*\.svgi$/i,
			use: [
				{
					loader: 'svg-inline-loader'
				}
			]
		});

		return config;
	}
};
