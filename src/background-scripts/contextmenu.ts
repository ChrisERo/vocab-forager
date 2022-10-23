import { CSMessage, CSMessageType } from "../utils/content-script-communication";
import { NonVolatileBrowserStorage } from "./non-volatile-browser-storage";


export class ContextMenuManager {
    static readonly activationID = 'activation';
    static readonly quizID = 'quiz';
    static readonly deleteHighlightsID = "delete_hilight";
    static readonly changeHighlightStyling = 'highlight-style';

    static readonly activateActivationCMTitle = '🟢   Activate';
    static readonly deactivateActivationCMTitle = '🔴  Deactivate';
    static readonly quizCMTitle = "🧠  Quiz";
    static readonly deleteHighlightCMTitle = '❌  Delete Hilighted Text';
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
    setUpContextMenus(): void {
        if (this.setUpCMsCalled) {
            console.warn("setUpContextMenus called again");
            return;
        }

        this.setUpCMsCalled = true;
        this.storage.getCurrentActivation().then((isActivated: boolean) => {
            this.setUpContextMenuGraphicalComponents(isActivated);
            this.setUpContextMenuListeners();
        });
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
            id: ContextMenuManager.changeHighlightStyling,
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
     * Instantiates context menu listeners
     * TODO: may want to make this more testable in future
     */
    private setUpContextMenuListeners(): void {
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            switch(info.menuItemId) {
                case ContextMenuManager.activationID: {
                    // flip activated state and notify all tabs (content script instances)
                    this.storage.getCurrentActivation().then((isActivatedNow: boolean) => {
                        let newIsActivatedState = !isActivatedNow;
                        this.storage.setCurrentActivation(newIsActivatedState);
                        this.updateContextMenuBasedOnActivation(newIsActivatedState);            
                        let getTabs = chrome.tabs.query({});
                        getTabs.then(function (tabs: chrome.tabs.Tab[]) {
                            let message: CSMessage = {
                                messageType: CSMessageType.ActivationStateChange,
                                payload: {newActivatedState: newIsActivatedState},
                            }
                            for (let tabElements of tabs) {
                                if (tabElements.id !== undefined) {
                                    chrome.tabs.sendMessage(tabElements.id, message)
                                }
                            }
                        });
                    });
                    break;
                }
                case ContextMenuManager.deleteHighlightsID: {
                    // notify trigerring tab that it needs to delete something
                    if (tab === undefined || tab.id === undefined) {
                        console.error('delete highlights trigerred wtihout valid tab')
                        break;
                    }
                    let message: CSMessage = {
                        messageType: CSMessageType.DeleteChosenHighlight,
                    }
                    chrome.tabs.sendMessage(tab.id, message);
                    break;
                }
                case ContextMenuManager.quizID: {
                    // notify triggering tab that it needs to delete something
                    if (tab === undefined || tab.id === undefined) {
                        console.error('quiz triggered without active tab')
                        break;
                    }
                    let message: CSMessage = {
                        messageType: CSMessageType.StartQuiz,
                    }
                    chrome.tabs.sendMessage(tab.id, message);
                    break;
                }
                case ContextMenuManager.changeHighlightStyleingTitle: {
                    // notify triggering tab that it needs to change highlight style
                    if (tab === undefined || tab.id === undefined) {
                        console.error('highlight change triggered without active tab')
                        break;
                    }
                    let message: CSMessage = {
                        messageType: CSMessageType.ChangeHighlightStyle,
                    }
                    chrome.tabs.sendMessage(tab.id, message);
                    break;
                }
                default: {
                    console.error(`unexpected menu item ${info.menuItemId}`)
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