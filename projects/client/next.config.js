const WorkerPlugin = require('worker-plugin');
module.exports = {
	webpack(config, { isServer }) {
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

		config.resolve.alias = {
			...config.resolve.alias,
			react: 'preact/compat',
			'react-dom/test-utils': 'preact/test-utils',
			'react-dom': 'preact/compat',
			'react-ssr-prepass': 'preact-ssr-prepass'
			// Must be below test-utils
		};

		return config;
	}
};
