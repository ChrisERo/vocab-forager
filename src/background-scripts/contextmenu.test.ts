import { CSMessageType } from "../utils/content-script-communication";
import { ContextMenuManager } from "./contextmenu";
import { MockDataStorage } from "./dictionary.test";
import { MockLocalStorage } from "./indexed-db-nv-storage.test";


const setUpBrowser = () => {
    const contextMenuStuff: any = {};
    const messagesSent: any = {};
    const tabs: chrome.tabs.Tab [] = [{
        id: 1,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 0,
        active: false,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: false,
        groupId: 0
    }, {
        id: 2,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 0,
        active: false,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: false,
        groupId: 0
    }, {
        id: 3,
        index: 0,
        pinned: false,
        highlighted: false,
        windowId: 0,
        active: false,
        incognito: false,
        selected: false,
        discarded: false,
        autoDiscardable: false,
        groupId: 0
    }];
    const listeners: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab | undefined) => void) [] = [];
    global.chrome = {
        contextMenus: {
            contextMenuStuff: contextMenuStuff,
            update: (id: string | number, updateProperties: any, callback?: () => void): void => {
                contextMenuStuff[id] = {
                    ...contextMenuStuff[id],
                    ...updateProperties
                }
            },
            create: (createProperties: any, callback?: () => void): number | string => {
                let id: string | number = createProperties['id'];
                contextMenuStuff[id] = createProperties;
                return id;
            },
            onClicked: {
                listeners: listeners,
                addListener: (callback: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab | undefined) => any): void => {
                    listeners.push(callback);
                }
            }
        },
        tabs: {
            messagesSent: messagesSent,
            sendMessage: async (tabId: number, message: any): Promise<void> => {
                if (messagesSent[tabId] === undefined || messagesSent[tabId] === null) {
                    messagesSent[tabId] = [];
                }

                messagesSent[tabId].push(message);
                return;
            },
            query: (x: any) => new Promise((resolve, _) => resolve(tabs))
        },
        storage: {
            local: new MockLocalStorage(),
            sync: {
                ...new MockLocalStorage(),
                MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: -1,
                QUOTA_BYTES_PER_ITEM: -1,
                MAX_ITEMS: -1,
                MAX_WRITE_OPERATIONS_PER_HOUR: -1,
                MAX_WRITE_OPERATIONS_PER_MINUTE: -1,
            } as chrome.storage.SyncStorageArea,
            session: new MockLocalStorage(),
            managed: new MockLocalStorage(),
            onChanged: {} as chrome.storage.StorageChange,
        }
    } as unknown as typeof chrome;
    }


describe('Contextmenu Tests', () => {

    it.each([
        [false, 1, false],
        [false, 2, false],
        [true, 0, true],
        [true, 1, false ],
        [true, 2, false ],
    ])('setUpContextMenu', async (currentActivation: boolean, timesToRunSetup: number, isEmptyExpected: boolean) => {
        setUpBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(currentActivation);
        const cmManager = new ContextMenuManager(localStorage);

        for (let i = 0; i < timesToRunSetup; i++) {
            await cmManager.setUpContextMenus();
        }

        const contextMenusStuff = (chrome.contextMenus as any)['contextMenuStuff']
        if (isEmptyExpected) {
            expect(Object.keys(contextMenusStuff).length).toBe(0);
        } else {
            const expectedIds = [
                ContextMenuManager.activationID,
                "separator-1",
                ContextMenuManager.quizID,
                "separator-2",
                ContextMenuManager.changeHighlightStylingID,
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
        setUpBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(isActivatedOG);
        const cmManager = new ContextMenuManager(localStorage);

        await cmManager.setUpContextMenus();
        const contextMenusStuff = (chrome.contextMenus as any)['contextMenuStuff']
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
        setUpBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(true);
        const cmManager = new ContextMenuManager(localStorage);

        await cmManager.setUpContextMenus();
        const contextMenusStuff = (chrome.contextMenus as any)['contextMenuStuff']
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
       [false, ContextMenuManager.quizID, undefined, false, null],
       [false, ContextMenuManager.quizID, {id: 1}, true, {1: [{messageType: CSMessageType.StartQuiz}]}],
       [false, ContextMenuManager.quizID, {id: 0}, true, {0: [{messageType: CSMessageType.StartQuiz}]}],
       [false, ContextMenuManager.deleteHighlightsID, undefined, false, null],
       [false, ContextMenuManager.deleteHighlightsID, {id: 1}, true, {1: [{messageType: CSMessageType.DeleteChosenHighlight}]}],
       [false, ContextMenuManager.deleteHighlightsID, {id: 0}, true, {0: [{messageType: CSMessageType.DeleteChosenHighlight}]}],
       [false, ContextMenuManager.changeHighlightStylingID, undefined, false, null],
       [false, ContextMenuManager.changeHighlightStylingID, {id: 1}, true, {1: [{messageType: CSMessageType.ChangeHighlightStyle}]}],
       [false, ContextMenuManager.changeHighlightStylingID, {id: 0}, true, {0: [{messageType: CSMessageType.ChangeHighlightStyle}]}],
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
        setUpBrowser();
        const globalDict = {languagesToResources: {}, currentDictionary: {index: -1, language: ''}};
        const localStorage = new MockDataStorage(globalDict);
        localStorage.setCurrentActivation(isActivatedOG);
        const cmManager = new ContextMenuManager(localStorage);


        await cmManager.setUpContextMenus();
        const info = {menuItemId}

        const listeners = (chrome.contextMenus.onClicked as any)['listeners'];
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

        const sentMessages = (chrome.tabs as any)['messagesSent'];
        expect(sentMessages).toEqual(messagesSentExpected);
        return;
    });
});