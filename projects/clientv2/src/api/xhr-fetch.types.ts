export type XHRFetchInit = {
	method?: 'POST' | 'GET';
	headers?: { [x: string]: string };
	body?: string;
	credentials?: 'include' | 'omit';
};
