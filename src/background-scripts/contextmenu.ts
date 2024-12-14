import { CSMessage, CSMessageType } from "../utils/content-script-communication";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export class ContextMenuManager {
    static readonly activationID = 'activation';
    static readonly quizID = 'quiz';
    static readonly deleteHighlightsID = "delete_highlight";
    static readonly changeHighlightStylingID = 'highlight-style';

    static readonly activateActivationCMTitle = '🟢   Activate';
    static readonly deactivateActivationCMTitle = '🔴  Deactivate';
    static readonly quizCMTitle = "🧠  Quiz";
    static readonly deleteHighlightCMTitle = '❌  Delete Highlighted Text';
    static readonly changeHighlightStyleingTitle = '🖌 Change Highlight Style';

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
    async setUpContextMenus(): Promise<void> {
        if (this.setUpCMsCalled) {
            console.warn("setUpContextMenus called again");
            return;
        }

        this.setUpCMsCalled = true;
        const isActivated = await this.storage.getCurrentActivation();
        this.setUpContextMenuGraphicalComponents(isActivated);
        this.setUpContextMenuListeners();
        return;
    }

    /**
     * Instantiates the graphical components to initial context menus
     *
     * @param isActivated whether addon should be considered activated or not
     */
    private setUpContextMenuGraphicalComponents(isActivated: boolean): void {
        chrome.contextMenus.create({
            id: ContextMenuManager.activationID,
            title: isActivated ?
                ContextMenuManager.deactivateActivationCMTitle :
                ContextMenuManager.activateActivationCMTitle,
            contexts: ["all"],
          });
          chrome.contextMenus.create({
            id: "separator-1",
            type: "separator",
            contexts: ["all"]
          });
          chrome.contextMenus.create({
            id: ContextMenuManager.quizID,
            title: ContextMenuManager.quizCMTitle,
            contexts: ["all"],
          });
          chrome.contextMenus.create({
            id: "separator-2",
            type: "separator",
            contexts: ["all"]
          });
          chrome.contextMenus.create({
            id: ContextMenuManager.changeHighlightStylingID,
            title: ContextMenuManager.changeHighlightStyleingTitle,
            contexts: ["all"],
          });
          chrome.contextMenus.create({
            id: "separator-3",
            type: "separator",
            contexts: ["all"]
          });
          chrome.contextMenus.create({
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
    private async specificTabSend(tab: chrome.tabs.Tab | undefined, messageType: CSMessageType, errorMessage: string): Promise<void> {
        // notify triggering tab that it needs to delete something
        if (tab === undefined || tab.id === undefined) {
            console.error(errorMessage);
            return;
        }
        const message: CSMessage = {
            messageType,
        }

        await chrome.tabs.sendMessage(tab.id, message);
        return;
    }

    /**
     * Instantiates context menu listeners
     */
    private setUpContextMenuListeners(): void {
        chrome.contextMenus.onClicked.addListener((info, tab): Promise<void> => {
            switch(info.menuItemId) {
                case ContextMenuManager.activationID: {
                    return new Promise<void>(async (resolve) => {
                        // flip activated state and notify all tabs (content script instances)
                        const isActivatedNow: boolean = await this.storage.getCurrentActivation()
                        const newIsActivatedState = !isActivatedNow;
                        this.storage.setCurrentActivation(newIsActivatedState);
                        this.updateContextMenuBasedOnActivation(newIsActivatedState);
                        const tabs: chrome.tabs.Tab[] = await chrome.tabs.query({});
                        const message: CSMessage = {
                            messageType: CSMessageType.ActivationStateChange,
                            payload: {newActivatedState: newIsActivatedState},
                        }
                        for (let tabElement of tabs) {
                            if (tabElement.id !== undefined) {
                                try {
                                    await chrome.tabs.sendMessage(tabElement.id, message);
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
                case ContextMenuManager.changeHighlightStylingID: {
                    return this.specificTabSend(
                        tab,
                        CSMessageType.ChangeHighlightStyle,
                        'highlight change triggered without active tab'
                    );
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
       chrome.contextMenus.update(ContextMenuManager.deleteHighlightsID,
        {visible: true});
    }

    /**
     * Hides context menu that exposeDeleteContextMenu reveals
     */
    hideDeleteContextMenu(): void {
        chrome.contextMenus.update(ContextMenuManager.deleteHighlightsID,
            {visible: false});
    }

    /**
     * Updates context menus based on whether extension is activated or not
     */
     updateContextMenuBasedOnActivation(isActivated: boolean): void {
        let title = isActivated ?
            ContextMenuManager.deactivateActivationCMTitle :
            ContextMenuManager.activateActivationCMTitle;
        chrome.contextMenus.update(ContextMenuManager.activationID, {
            title,
        });
    }

}
