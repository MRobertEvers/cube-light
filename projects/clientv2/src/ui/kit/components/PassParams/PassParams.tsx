import React from 'react';
import { useParams } from 'react-router-dom';

export type ParamMapper<T> = {
	[Param in keyof T]: T[Param] extends string
		? string
		: { key: string; mapper: (s: string) => T[Param] };
};

export interface PassParamsProps<T> {
	Component: React.ComponentType<T>;
	params: ParamMapper<T>;
}
export function PassParams<T>(props: PassParamsProps<T>) {
	const { Component, params } = props;
	const inputParams = useParams() as any;

	const passProps: T & React.JSX.IntrinsicAttributes = React.useMemo(() => {
		const buildProps: Partial<T & React.JSX.IntrinsicAttributes> = {};
		for (const param in params) {
			const key = params[param];
			const value =
				typeof key === 'string'
					? inputParams[key]
					: key.mapper(inputParams[key.key]);

			buildProps[param] = value;
		}

		return buildProps as T & React.JSX.IntrinsicAttributes;
	}, [params]);

	return <Component {...passProps} />;
}
