import { ContextMenuManager } from "./contextmenu";
import { MockDataStorage } from "./dictionary.test";
import { MockLocalStorage } from "./indexed-db-nv-storage.test";


const setUpBrowser = () => {
    const contextMenuStuff: any = {}
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
                addListener: (callback: (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab | undefined) => void): void => {

                }
            }

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
});