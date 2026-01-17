import { JSDOM } from "jsdom";
import { setUpMockBrowser } from "../__mocks__/webextension-polyfill-mock";
import browser  from "webextension-polyfill";

setUpMockBrowser();  // needed to setting fetch-banner's constant for test.
import { loadBannerHtml } from "./fetch-banner";

type OnClickFunction = ((this: GlobalEventHandlers, ev: MouseEvent) => any);

describe('Testing Service Worker', () => {
    beforeEach(() => {
        setUpMockBrowser();
    });

    it.each([
        [
            'Do not Make Banner a Link 1',
            `
            <head></head><body>
                <div id="banner_anchor"></div> 
                <p>Hello World!</p>
            </body>
            `,
            browser.runtime.getURL('web_pages/popup.html'),
            `
            <head></head><body>
                <div id="banner_anchor"><div class="banner">
            <h1 id="banner_text">VocabForager</h1>
            </div></div> 
                <p>Hello World!</p>
            </body>
            `,
            false,
        ],
        [
            'Do not Make Banner a Link 2',
            `
            <head></head>
            <body>
            <p>Competitors</p>
            <table><tbody>
            <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Time</th>
            </tr>
            <tr>
                <td>Emanuel Lasker</td>
                <td>Germany</td>
                <td>34.567s</td>
            </tr>
            <tr>
                <td>Jose Capablanca</td>
                <td>Cuba</td>
                <td>14.435s</td>
            </tr>
            </tbody></table>
            <div id="banner_anchor"></div> 
            </body>
            `,
            browser.runtime.getURL('web_pages/popup.html'),
            `
            <head></head>
            <body>
            <p>Competitors</p>
            <table><tbody>
            <tr>
                <th>Name</th>
                <th>Country</th>
                <th>Time</th>
            </tr>
            <tr>
                <td>Emanuel Lasker</td>
                <td>Germany</td>
                <td>34.567s</td>
            </tr>
            <tr>
                <td>Jose Capablanca</td>
                <td>Cuba</td>
                <td>14.435s</td>
            </tr>
            </tbody></table>
            <div id="banner_anchor"><div class="banner">
            <h1 id="banner_text">VocabForager</h1>
            </div></div>
            </body>
            `,
            false,
        ],
        [
            'Make Banner a Link when vocab-forager already exists',
            `
            <head></head><body>
                <div id="banner_text">VocabForager</div> 
                <div id="banner_anchor"></div> 
                <p>Hello World!</p>
                <div id="banner_anchor"></div> 
            </body>
            `,
            browser.runtime.getURL('web_pages/myCustomPage.html'),
            `
            <head></head><body>
                <div id="banner_text">VocabForager</div> 
                <div id="banner_anchor"><div class="banner">
            <h1 id="banner_text">VocabForager</h1>
            </div></div> 
                <p>Hello World!</p>
                <div id="banner_anchor"></div> 
            </body>
            `,
            true,
        ],
        [
            'Make Banner under normal circumstances',
            `
            <head></head><body>
                <div id="banner_anchor"></div> 
                <p>Hello World!</p>
            </body>
            `,
            browser.runtime.getURL('web_pages/myPersonalPage.html'),
            `
            <head></head><body>
                <div id="banner_anchor"><div class="banner">
            <h1 id="banner_text">VocabForager</h1>
            </div></div> 
                <p>Hello World!</p>
            </body>
            `,
            true,
        ],
    ])('loadBannerHtml: [%s]', async (_testName: string, pageContent: string,
                                      myURL: string,
                                      expectedNewPage: string,
                                      isBannerTextPresent: boolean) => {
        jest.clearAllMocks();  // doing this beforeEach distorts setup test 
        const dom: JSDOM = new JSDOM(pageContent);
        dom.reconfigure({ url: myURL });
        global.document = dom.window.document;
        global.window = dom.window as any as Window & typeof globalThis;
        
        await loadBannerHtml();

        // Compare without spaces, a hack to deal with weird indentations
        const actualHTML = document.documentElement.innerHTML
            .replace(/\s+/g, '');
        expectedNewPage = expectedNewPage.replace(/\s+/g, '');
        expect(actualHTML).toBe(expectedNewPage);

        const bannerTextElement: HTMLElement = dom.window.document
            .getElementById('banner_text') as HTMLElement;
        if (isBannerTextPresent) {
            expect(bannerTextElement).not.toBeNull();
            expect(bannerTextElement.onclick).not.toBeUndefined();
            expect(bannerTextElement.onclick).not.toBeNull();
            (bannerTextElement.onclick as OnClickFunction)({} as MouseEvent);
            // JSDOM does not support href change in sourcecode:
            // https://github.com/jsdom/jsdom?tab=readme-ov-file#reconfiguring-the-jsdom-with-reconfiguresettings
            //expect(dom.window.location.href).toBe(
            //    browser.runtime.getURL("web_pages/index.html")
            //);
        } else {
            if (bannerTextElement !== null) {
                expect(bannerTextElement.onclick).toBeNull();
            }
        }

        return;
    });
});

 
