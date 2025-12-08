import browser from 'webextension-polyfill';
import type { Tabs } from 'webextension-polyfill';
import { CSMessage, CSMessageType } from "../utils/content-script-communication";
import { IndexedDBStorage } from "./indexed-db-nv-storage";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export class ContextMenuManager {
    static readonly activationID = 'activation';
    static readonly quizID = 'quiz';
    static readonly deleteHighlightsID = "delete_highlight";
    static readonly goToSiteDataPageID = 'site-data-page';

    static readonly activateActivationCMTitle = '🟢   Activate';
    static readonly deactivateActivationCMTitle = '🔴  Deactivate';
    static readonly quizCMTitle = "🧠  Quiz";
    static readonly deleteHighlightCMTitle = '❌  Delete Highlighted Text';
    static readonly goToSitePageTitle = '🕮 Go to site data page';

    setUpCMsCalled: boolean;  // true iff context menus have already been set up
    storage: NonVolatileBrowserStorage;


    constructor(storage: NonVolatileBrowserStorage) {
        this.setUpCMsCalled = false;
        this.storage = storage;
    }

    /**
     * If called for first time, attempts to create the context menus available
     * for usage with their intial configurations; also sets up the context menu listeners.
     * Future calls will be noops.
     */
    async setUpContextMenus(siteDataStorage?: IndexedDBStorage): Promise<void> {
        if (this.setUpCMsCalled) {
            console.warn("setUpContextMenus called again");
            return;
        }

        this.setUpCMsCalled = true;
        const isActivated = await this.storage.getCurrentActivation();
        this.setUpContextMenuGraphicalComponents(isActivated);
        this.setUpContextMenuListeners(siteDataStorage);
        return;
    }

    /**
     * Instantiates the graphical components to initial context menus
     *
     * @param isActivated whether addon should be considered activated or not
     */
    private setUpContextMenuGraphicalComponents(isActivated: boolean): void {
        browser.contextMenus.create({
            id: ContextMenuManager.activationID,
            title: isActivated ?
                ContextMenuManager.deactivateActivationCMTitle :
                ContextMenuManager.activateActivationCMTitle,
            contexts: ["all"],
          });
          browser.contextMenus.create({
            id: "separator-1",
            type: "separator",
            contexts: ["all"]
          });
          browser.contextMenus.create({
            id: ContextMenuManager.quizID,
            title: ContextMenuManager.quizCMTitle,
            contexts: ["all"],
          });
          browser.contextMenus.create({
            id: "separator-2",
            type: "separator",
            contexts: ["all"]
          });
          browser.contextMenus.create({
            id: ContextMenuManager.goToSiteDataPageID,
            title: ContextMenuManager.goToSitePageTitle,
            contexts: ["all"],
          });
          browser.contextMenus.create({
            id: "separator-3",
            type: "separator",
            contexts: ["all"]
          });
          browser.contextMenus.create({
            id: ContextMenuManager.deleteHighlightsID,
            title: ContextMenuManager.deleteHighlightCMTitle,
            contexts: ["all"],
            visible: false
          });
    }

    /**
     * Sends signal message to tab passed in with messageType set to messageType. If tab is
     * or its id is undefined, logs errorMessage
     *
     * @param tab tab info to which to send message
     * @param messageType type of message to send to listener in tab
     * @param errorMessage error message to log if tab contains invalid data
     */
    private async specificTabSend(tab: Tabs.Tab | undefined, messageType: CSMessageType, errorMessage: string): Promise<void> {
        // notify triggering tab that it needs to delete something
        if (tab === undefined || tab.id === undefined) {
            console.error(errorMessage);
            return;
        }
        const message: CSMessage = {
            messageType,
        }

        await browser.tabs.sendMessage(tab.id, message);
        return;
    }

    /**
     * Instantiates context menu listeners
     */
    private setUpContextMenuListeners(siteDataStorage?: IndexedDBStorage): void {
        browser.contextMenus.onClicked.addListener((info: any, tab: Tabs.Tab | undefined): Promise<void> => {
            switch(info.menuItemId) {
                case ContextMenuManager.activationID: {
                    return new Promise<void>(async (resolve) => {
                        // flip activated state and notify all tabs (content script instances)
                        const isActivatedNow: boolean = await this.storage.getCurrentActivation()
                        const newIsActivatedState = !isActivatedNow;
                        this.storage.setCurrentActivation(newIsActivatedState);
                        this.updateContextMenuBasedOnActivation(newIsActivatedState);
                        const tabs: Tabs.Tab[] = await browser.tabs.query({});
                        const message: CSMessage = {
                            messageType: CSMessageType.ActivationStateChange,
                            payload: {newActivatedState: newIsActivatedState},
                        }
                        for (let tabElement of tabs) {
                            if (tabElement.id !== undefined) {
                                try {
                                    await browser.tabs.sendMessage(tabElement.id, message);
                                } catch (err) {  // if extension is not running in certain sites, could get an error
                                    console.warn(`Failed to send message to tab ${tabElement.index}-${tabElement.title}: ${err}`);
                                }
                            }
                        }
                        resolve();
                    });
                }
                case ContextMenuManager.deleteHighlightsID: {
                    return this.specificTabSend(
                        tab,
                        CSMessageType.DeleteChosenHighlight,
                        'delete highlights triggered without valid tab'
                    );
                }
                case ContextMenuManager.quizID: {
                    return this.specificTabSend(
                        tab,
                        CSMessageType.StartQuiz,
                        'quiz triggered without active tab'
                    );
                }
                case ContextMenuManager.goToSiteDataPageID: {
                    const urlIn: string | undefined = tab?.url;
                    if (urlIn === undefined) {
                        console.error(`URL of tab ${tab?.index} is undefined`);
                        return Promise.resolve();
                    }
                    if (siteDataStorage === undefined) {
                        console.log('No access to siteData persistent storage');
                        return Promise.resolve();
                    }

                    return siteDataStorage.getPageId(urlIn).then((response: any) => {
                        if (response === undefined) {
                            console.error(`No pageId found for ${urlIn}`);
                            return;
                        }
                        const url = `web_pages/see-sites.html?pageId=${response}`;
                        browser.tabs.create({ url });
                        return;
                    });
                }
                default: {
                    console.error(`unexpected menu item ${info.menuItemId}`)
                    return Promise.resolve();
                }
            }
        });
    }

    /**
     * Exposes context menu for deleteing a highlighted text from page meta-data
     */
    exposeDeleteContextMenu(): void {
       browser.contextMenus.update(ContextMenuManager.deleteHighlightsID,
        {visible: true});
    }

    /**
     * Hides context menu that exposeDeleteContextMenu reveals
     */
    hideDeleteContextMenu(): void {
        browser.contextMenus.update(ContextMenuManager.deleteHighlightsID,
            {visible: false});
    }

    /**
     * Updates context menus based on whether extension is activated or not
     */
     updateContextMenuBasedOnActivation(isActivated: boolean): void {
        let title = isActivated ?
            ContextMenuManager.deactivateActivationCMTitle :
            ContextMenuManager.activateActivationCMTitle;
        browser.contextMenus.update(ContextMenuManager.activationID, {
            title,
        });
    }
}
