export type XHRFetchInit = {
	method?: 'POST' | 'GET';
	headers?: string[];
	body?: string;
	credentials?: 'include' | 'omit';
};
