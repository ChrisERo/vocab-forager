/**
 * Separates the scheme and host from the path of a valid url
 * 
 * Assumes url is a valid url
 * 
 * @param url string representing url to parse
 * @returns array with 1 element if url has no path, otherwise 2 elements, where the first
 * element is the combination of scheme and host of a url and the second is the path,
 * including first /.
 */
export function parseURL(url: string): string[] {
    if (url.length > 0 && url.charAt(url.length - 1) === '/') {
        url = url.substring(0, url.length - 1);
    }

    let schemeAndHost: string;
    let urlPath: string;
    const indexOfSchemeEnd = url.indexOf('://');
    const indexOfHostEnd = url.indexOf('/', indexOfSchemeEnd + 3);
    if (indexOfHostEnd === -1) {
        schemeAndHost = url;
        urlPath = '';
    } else {
        schemeAndHost = url.substring(0, indexOfHostEnd);
        urlPath = url.substring(indexOfHostEnd);
    }

    return [schemeAndHost, urlPath];
 }

 export function combineUrl(scheme: string, path: string) {
    if (path === '') {
        return scheme;
    } else {
        return scheme + path;
    }
 }
