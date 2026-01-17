import { CSMessageType } from "../utils/content-script-communication";
import { ContextMenuManager } from "./contextmenu";
import { MockDataStorage } from "./dictionary.test";
import { IndexedDBStorage } from "./indexed-db-nv-storage";
import { setUpMockBrowser } from "../__mocks__/webextension-polyfill-mock";
import browser from "webextension-polyfill";
import "fake-indexeddb/auto";  // needs to come after indexed-db-nv-storage import

describe('Contextmenu Tests', () => {

    it.each([
        [false, 1, false],
        [false, 2, false],
        [true, 0, true],
        [true, 1, false ],
        [true, 2, false ],
    ])('setUpContextMenu', async (currentActivation: boolean, timesToRunSetup: number, isEmptyExpected: boolean) => {
        setUpMockBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(currentActivation);
        const cmManager = new ContextMenuManager(localStorage);

        for (let i = 0; i < timesToRunSetup; i++) {
            await cmManager.setUpContextMenus();
        }

        const contextMenusStuff = (browser.contextMenus as any)['contextMenuStuff']
        if (isEmptyExpected) {
            expect(Object.keys(contextMenusStuff).length).toBe(0);
        } else {
            const expectedIds = [
                ContextMenuManager.activationID,
                "separator-1",
                ContextMenuManager.quizID,
                "separator-2",
                ContextMenuManager.goToSiteDataPageID,
                "separator-3",
                ContextMenuManager.deleteHighlightsID
            ];
            expect(Object.keys(contextMenusStuff).length).toBe(expectedIds.length)
                expectedIds.forEach(menuId => {
                expect(contextMenusStuff[menuId]).not.toBeUndefined()
                expect(contextMenusStuff[menuId]).not.toBeNull()
            });
            const tabData: any = contextMenusStuff[ContextMenuManager.activationID];
            let expectedTitle: string;
            if (currentActivation) {
                expectedTitle = ContextMenuManager.deactivateActivationCMTitle;
            } else {
                expectedTitle = ContextMenuManager.activateActivationCMTitle;
            }
            expect(tabData.title).toBe(expectedTitle)
        }

        return;
    });

    it.each([
      [false, false],
      [false, true],
      [false, false],
      [true, true],
    ])('updateContextMenuBasedOnActivation %s %s', async (isActivatedOG: boolean, isActivatedNew: boolean) => {
        setUpMockBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(isActivatedOG);
        const cmManager = new ContextMenuManager(localStorage);

        await cmManager.setUpContextMenus();
        const contextMenusStuff = (browser.contextMenus as any)['contextMenuStuff']
        if (isActivatedOG) {
            expect(contextMenusStuff[ContextMenuManager.activationID].title).toBe(ContextMenuManager.deactivateActivationCMTitle)
        } else {
            expect(contextMenusStuff[ContextMenuManager.activationID].title).toBe(ContextMenuManager.activateActivationCMTitle)
        }

        cmManager.updateContextMenuBasedOnActivation(isActivatedNew);
        if (isActivatedNew) {
            expect(contextMenusStuff[ContextMenuManager.activationID].title).toBe(ContextMenuManager.deactivateActivationCMTitle)
        } else {
            expect(contextMenusStuff[ContextMenuManager.activationID].title).toBe(ContextMenuManager.activateActivationCMTitle)
        }

        return;
    });

    test("Delete Context Menu Hide and Show", async () => {
        setUpMockBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(true);
        const cmManager = new ContextMenuManager(localStorage);

        await cmManager.setUpContextMenus();
        const contextMenusStuff = (browser.contextMenus as any)['contextMenuStuff']
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeFalsy();

        cmManager.exposeDeleteContextMenu();
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeTruthy();
        cmManager.exposeDeleteContextMenu();
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeTruthy();

        cmManager.hideDeleteContextMenu();
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeFalsy();
        cmManager.hideDeleteContextMenu();
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeFalsy();

        cmManager.exposeDeleteContextMenu();
        expect(contextMenusStuff[ContextMenuManager.deleteHighlightsID].visible).toBeTruthy();

        return;
    });

    it.each([
        [
            'https://www.articles.fake.net/articles/334567',
            true,
            1,
        ], 
        [
            undefined,
            true,
            -1,
        ],
        [
            'https://www.articles.fake.net/articles/456701',
            true,
            6,  // Not sure how 6 is the id chosen, but seems to work.
        ],
        [
            'https://www.articles.fake.net/articles/456701',
            false,
            -1,
        ],
    ])('Test Context Menu Creation', async (url: string | undefined, useSSD: boolean, expectedId: number) => {
        setUpMockBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(true);
        const cmManager = new ContextMenuManager(localStorage);

        if (useSSD) {
            let dataToStore = {
                'https://www.articles.fake.net/articles/334567': {
                    schemeAndHost: 'https://www.articles.fake.net',
                    urlPath: '/articles/334567',
                    wordEntries: [
                        {
                            word: 'comida',
                            startOffset: 0,
                            endOffset: 13,
                            nodePath: [[9,6,3,0]]
                        }
                    ],
                    missingWords: ["foo", "bar"]
                },
                'https://www.articles.fake.net/articles/456701': {
                    schemeAndHost: 'https://www.articles.fake.net',
                    urlPath: '/articles/456701',
                    wordEntries: [
                        {
                            word: 'manzana',
                            startOffset: 33,
                            endOffset: 44,
                            nodePath: [[9,6,3,0], [10,6,3,0]]
                        },
                        {
                            word: 'banana',
                            startOffset: 45,
                            endOffset: 12,
                            nodePath: [[9,6,3,0], [9,7,3,0]]
                        }
                    ],
                    missingWords: []
                },
            };
            const siteDataStorage = new IndexedDBStorage();
            await siteDataStorage.setUp();
            await siteDataStorage .uploadExtensionData(dataToStore);
            await cmManager.setUpContextMenus(siteDataStorage);
        } else {
            await cmManager.setUpContextMenus();
        }

        const info = {'menuItemId': ContextMenuManager.goToSiteDataPageID};
        const tabInfo = {id: 12345, url: url};

        const listeners = (browser.contextMenus.onClicked as any)['listeners'];
        expect(listeners.length).toBe(1);  // good sanity check
        await listeners[0](info, tabInfo);

        if (!useSSD || url === undefined) {
            try {
                await browser.tabs.get(4);
            } catch (err) {
                expect(err).toBe('Fetched imaginary tab'); // no tab created
                return;
            }
            return;
        }
        const tab: any = await browser.tabs.get(5);
        const expectedUrl = `web_pages/see-sites.html?pageId=${expectedId}`;
        expect(tab.url).toContain(expectedUrl);
        expect(tab.url.substring(tab.url.length - expectedUrl.length)).toContain(expectedUrl);
        return;
    });

    it.each([
       [false, ContextMenuManager.quizID, undefined, false, null],
       [false, ContextMenuManager.quizID, {id: 1}, true, {1: [{messageType: CSMessageType.StartQuiz}]}],
       [false, ContextMenuManager.quizID, {id: 0}, true, {0: [{messageType: CSMessageType.StartQuiz}]}],
       [false, ContextMenuManager.deleteHighlightsID, undefined, false, null],
       [false, ContextMenuManager.deleteHighlightsID, {id: 1}, true, {1: [{messageType: CSMessageType.DeleteChosenHighlight}]}],
       [false, ContextMenuManager.deleteHighlightsID, {id: 0}, true, {0: [{messageType: CSMessageType.DeleteChosenHighlight}]}],
       [false, ContextMenuManager.goToSiteDataPageID, undefined, false, {}],
       [false, ContextMenuManager.goToSiteDataPageID, {id: 1}, true, {}],
       [false, ContextMenuManager.goToSiteDataPageID, {id: 0}, true, {}],
       [false, 'fakeCMId', undefined, false, null],
       [false, 'fakeCMId', {id: 0}, false, null],
       [false, ContextMenuManager.activationID, undefined, true, {
            1: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: true}}],
            2: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: true}}],
            3: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: true}}],
        }
       ],
       [false, ContextMenuManager.activationID, undefined, false, {
            1: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: false}}],
            2: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: false}}],
            3: [{messageType: CSMessageType.ActivationStateChange, payload: {newActivatedState: false}}],
        }
       ],
    ])('Test CM Listener %s %s', async (isActivatedOG: boolean, menuItemId: string, tabInfo: any, shouldSucceede: boolean, messagesSentExpected: any) => {
        setUpMockBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(isActivatedOG);
        const cmManager = new ContextMenuManager(localStorage);


        await cmManager.setUpContextMenus();
        const info = {menuItemId}

        const listeners = (browser.contextMenus.onClicked as any)['listeners'];
        expect(listeners.length).toBe(1);
        try {
            for (let i = 0; i < listeners.length; i++) {
                let element = listeners[i];
                await element(info, tabInfo);
            }
            expect(shouldSucceede).toBeTruthy();
        } catch (ex) {
            if (!shouldSucceede) {
                return;
            }
            throw ex;
        }

        const sentMessages = (browser.tabs as any)['messagesSent'];
        expect(sentMessages).toEqual(messagesSentExpected);
        return;
    });
});
