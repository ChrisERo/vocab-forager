import { combineUrl, parseURL } from "./utils";

describe('Util Module', () => {
    const parameters = [
        ['https://foo.com/foo/bar', 'https://foo.com', '/foo/bar'],
        ['https://foo.com', 'https://foo.com', ''],
        ['https://foo.com/', 'https://foo.com', ''],
        ['https://foo.com/foo/bar?base', 'https://foo.com', '/foo/bar?base'],
        ['http://foo.com/foo/bar?base', 'http://foo.com', '/foo/bar?base']
    ];
    it.each(parameters)('%# Parse %p', (url: string, host: string, path: string) => {
        const result = parseURL(url);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(host);
        expect(result[1]).toBe(path);
    });

    it.each(parameters)('%# Combine %p', (url: string, host: string, path: string) => {
        const result = combineUrl(host, path);
        if (url.charAt(url.length - 1) === '/') {
            url = url.substring(0, url.length - 1);
        }
        expect(result).toBe(url);
    });
});
