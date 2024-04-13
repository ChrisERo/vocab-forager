import "fake-indexeddb/auto";
import { backgroundWorkerPromise, contextMenuManager, dictionaryManager} from "./background";
import { ContextMenuManager } from "./contextmenu";
import { DictionaryManager } from "./dictionary";
import { IndexedDBStorage } from "./indexed-db-nv-storage";
import { setUpMockBrowser } from "./mocks/chrome";
import { LocalStorage } from "./non-volatile-browser-storage";
import { BSMessage, BSMessageType } from "../utils/background-script-communication";

jest.mock("./contextmenu");
jest.mock("./non-volatile-browser-storage");
jest.mock("./dictionary");


describe('Testing Service Worker', () => {

    beforeEach(() => {
        //jest.clearAllMocks();
        setUpMockBrowser();
    });

    test('initial setup is correct', async () => {
        expect(contextMenuManager.setUpContextMenus).toHaveBeenCalledTimes(1);
        const message: BSMessage = {
            messageType: BSMessageType.GetCurrentDictionary,
            payload: null
        };
        const sendResponse: (response?: any) => void = (resposne?: any) => {
        };
        
        
        await backgroundWorkerPromise;
        await (chrome.runtime.onMessage as any).testExecute(
            {isBogusMessage: true}, 
            null, 
            sendResponse
        );
        expect(dictionaryManager.getCurrentDictionaryId)
            .toHaveBeenCalledTimes(0);

        await (chrome.runtime.onMessage as any).testExecute(
            message, 
            null, 
            sendResponse
        );
        expect(dictionaryManager.getCurrentDictionaryId)
            .toHaveBeenCalledTimes(1);
    });

    test('initial setup is legeit', () => {
       
    });
});

