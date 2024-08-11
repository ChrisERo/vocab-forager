const POPUP_URL = chrome.runtime.getURL('web_pages/popup.html');

/**
 * Fetches html for banner and inserts them into current web page, inside
 * banner anchor div.
 * 
 * Assumes page has a div with id as "banner_anchor"
 */
 export function loadBannerHtml(): Promise<void> {
    return fetch(chrome.runtime.getURL("cross-page-assets/banner.html")).then(
        async function(response) {
            const bannerHtml: string = await response.text();
            const bannerAnchor = 
                document.getElementById('banner_anchor') as HTMLElement;
            bannerAnchor.innerHTML +=  bannerHtml;

            // Allow non-popup html pages' banners to enter 
            if (window.location.href !== POPUP_URL) {
                const bannerText = document.getElementById('banner_text') as HTMLElement;
                bannerText.onclick = function () {
                    const url = chrome.runtime.getURL("web_pages/index.html")
                    window.location.href = url;
                };
            }

            return;  // terminate async call for testing purposes.
    });
}

