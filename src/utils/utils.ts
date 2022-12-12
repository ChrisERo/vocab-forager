/**
 * Separates the scheme and host from the path of a valid url
 * 
 * Assumes url is a valid url
 * 
 * @param url string representing url to parse
 * @returns array with 2 string elements. The first element is a combination of the scheme
 * (protocol-section) of the url followed by the domain (host[:port]). The second element
 * is the path (including leading / character) of the url (empty string if no path is 
 * provided or if path is just /)
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

 /**
  * The opposite of parseURL(url: string): string[])
  * 
  * @param scheme scheme-host combination of url
  * @param path path of url.
  * @returns URL obtained when combining scheme with url (both of which correspond to 
  * elements returned by parseURL(url: string): string[]).
  */
 export function combineUrl(scheme: string, path: string) {
    if (path === '') {
        return scheme;
    } else {
        return scheme + path;
    }
 }
