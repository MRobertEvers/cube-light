const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const buildOptions = require('../build-config-options');

const { BACKEND_HOST_URI } = buildOptions;

const sourceDirectory = path.join(__dirname, '../../../src');
const modulesDirectory = path.join(__dirname, '../../../node_modules');
const buildDirectory = path.join(__dirname, '../../../dist');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
	mode: 'development',
	entry: ['react', 'react-dom', './src/assets/common.css', './src/index.tsx'],
	devtool: 'source-map',
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
		// Absolute paths to where modules can be resolved.
		modules: [sourceDirectory, modulesDirectory],
		alias: {
			src: sourceDirectory
		}
	},
	output: {
		publicPath: '/',
		path: buildDirectory
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Index',
			template: path.join('src', 'templates', 'index-development.template.html')
		}),
		new webpack.DefinePlugin({
			__SYS_BACKEND_HOST_URI__: JSON.stringify(BACKEND_HOST_URI)
		})
	],
	module: {
		rules: [
			{
				test: /\.ts(x?)$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader'
					}
				],
				include: [sourceDirectory]
			},
			{
				// https://webpack.js.org/loaders/style-loader/#injecttype
				// https://github.com/webpack-contrib/css-loader#scope
				test: /\.css$/,
				use: [
					{ loader: 'style-loader' },
					{
						loader: 'css-loader',
						options: {
							modules: {
								localIdentName: '[path][name]__[local]--[hash:base64:5]'
							}
						}
					}
				],
				include: [sourceDirectory]
			},
			{
				test: /.*\.(gif|png|jpg|jpeg|mp4)$/i,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'images/[name].[ext]'
						}
					}
				]
			},
			{
				test: /.*\.svgi$/i,
				use: [
					{
						loader: 'svg-inline-loader'
					}
				]
			}
		]
	}
};
