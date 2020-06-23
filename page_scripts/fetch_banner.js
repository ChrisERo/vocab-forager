/**
 * Converts html data (as string) into elements
 *
 * Code obtained from
 * https://gomakethings.com/converting-a-string-into-markup-with-vanilla-js/
 *
 * @param {String} str - html text to be converted to objects
 */
function stringToHTML(str) {
	var parser = new DOMParser();
	var doc = parser.parseFromString(str, 'text/html');
	return doc.body.childNodes[0]; // Just get content of body (one main element)
}

/**
 * Fetches html for banner and inserts them into current web page, inside
 * banner_anchor div.
 * 
 * Assumes page has a div with id as "banner_anchor"
 */
function load_banner_html() {
    // TODO: Do not use fetch, It is unstable.Use ajax call
    fetch(browser.runtime.getURL("cross-page-assets/banner.html"))
        .then(function(response) {
            return response.text();
        })
        .then(function(html) {
            // Add banner to right html element
            let banner_anchor = document.getElementById('banner_anchor');
            banner_anchor.appendChild(stringToHTML(html));
            let banner_text = document.getElementById('banner_text');

            // In all pages except popup, on click of banner, navigate to home page
            const POPUP_URL = browser.runtime.getURL('web_pages/popup.html');
            if (window.location.href !== POPUP_URL) {
                banner_text.onclick = function () {
                    let url = browser.runtime.getURL("web_pages/index.html")
                    window.location.href = url;
                };
            }

    });
}

load_banner_html();
