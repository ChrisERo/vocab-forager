import { readFileSync } from 'fs';
import { resolve } from "path";

// Path to public directory (where html and other webpage assets live)
const PUBLIC_DIR = __dirname + '/../../public';

export class MockLocalStorage implements chrome.storage.LocalStorageArea {

    private storage: {[key: string]: any};
    QUOTA_BYTES: number;

    onChanged: chrome.storage.StorageAreaChangedEvent;

    constructor() {
        this.storage = {};
        this.QUOTA_BYTES = -1;
        this.onChanged = {} as chrome.storage.StorageAreaChangedEvent;
    }
    setAccessLevel(accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS"; }): Promise<void>;
    setAccessLevel(accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS"; }, callback: () => void): void;
    setAccessLevel(accessOptions: unknown, callback?: unknown): void | Promise<void> {
        throw new Error("Method not implemented.");
    }



    getBytesInUse(callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: string | string[] | null | undefined): Promise<number>;
    getBytesInUse(keys: string | string[] | null, callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: unknown, callback?: unknown): void | Promise<number> {
        throw new Error("Method not implemented.");
    }
    clear(): Promise<void>;
    clear(callback?: (() => void) | undefined): void;
    clear(callback?: unknown): void | Promise<void> {
        return new Promise<void>((resolve, _) => {
            this.storage = {};
            resolve();
        });
    }

    set(items: { [key: string]: any; }): Promise<void> {
        return new Promise<void>((resolve, _) => {
            const keys = Object.keys(items);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                this.storage[k] = items[k];
            }
            resolve();
        });
    }

    remove(keys: string | string[]): Promise<void> {
        return new Promise<void>((resolve, _) => {
            if (Array.isArray(keys)) {
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    delete this.storage[k];
                }
            } else {
                delete this.storage[keys];
            }

            resolve();
        });
    }

    getKeys(): Promise<string[]> {
        return Promise.resolve(Object.keys(this.storage));
    }
    get(callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: string | string[] | { [key: string]: any; } | null | undefined): Promise<{ [key: string]: any; }>;
    get(keys: string | string[] | { [key: string]: any; } | null, callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: unknown, callback?: unknown): void | Promise<{ [key: string]: any; }> {
        return new Promise<object>((resolve, _) => {
            if (keys == null) {
                resolve({ ...this.storage });
            } else if (typeof keys === 'string' || keys instanceof String) {
                const key = keys as string;
                if (this.storage.hasOwnProperty(key)) {
                    resolve({[key]: this.storage[key]});
                } else {
                    resolve({});
                }
            } else {
                let keysList: string[];
                if (Array.isArray(keys)) {
                    keysList = keys;
                } else {
                    keysList = Object.keys(keys);
                }

                const returnObject: any = {};
                for (let i = 0; i < keysList.length; i++) {
                    const k = keysList[i];
                    if (this.storage.hasOwnProperty(k)) {
                        returnObject[k] = this.storage[k];
                    }
                }

                resolve(returnObject);
            }
        });
    }
}

const makeMockBrowser = () => {
    const onMessageListenersList: Function[] = [];
    const contextMenuStuff: any = {};
    const messagesSentToTabs: any = {};
    const messagesSentToWorkerScript: any[] = [];
    const tabs: chrome.tabs.Tab [] = [
        {
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
            frozen: false,
            groupId: 0
        },
        {
            id: 2,
            index: 1,
            pinned: false,
            highlighted: false,
            windowId: 0,
            active: false,
            incognito: false,
            selected: false,
            discarded: false,
            autoDiscardable: false,
            frozen: false,
            groupId: 0
        },
        {
            id: -13,
            index: 3,
            pinned: false,
            highlighted: false,
            windowId: 0,
            active: false,
            incognito: false,
            selected: false,
            discarded: false,
            autoDiscardable: false,
            groupId: 0,
            frozen: false,
            title: "DO_NOT_SEND"
        },
        {
            id: 3,
            index: 4,
            pinned: false,
            highlighted: false,
            windowId: 0,
            active: false,
            incognito: false,
            selected: false,
            discarded: false,
            autoDiscardable: false,
            frozen: false,
            groupId: 0
        }
    ];
    const listeners: ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab | undefined) => void) [] = [];
    return {
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
            create: async (message: chrome.tabs.CreateProperties): 
                Promise<chrome.tabs.Tab> => {
                const newId = tabs.length + 1;
                const newTab: chrome.tabs.Tab = {
                    ...message,
                    id: newId,
                    index: 0,
                    pinned: false,
                    highlighted: false,
                    windowId: 0,
                    active: false,
                    incognito: false,
                    selected: false,
                    discarded: false,
                    autoDiscardable: false,
                    frozen: false,
                    groupId: 0
                }
                tabs.push(newTab);
                return newTab
            },
            get: async (tabId: number): Promise<chrome.tabs.Tab> => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab: chrome.tabs.Tab = tabs[i];
                    if (tab.id === tabId) {
                        return tab;
                    }
                }
                throw 'Fetched imaginary tab';
            },
            messagesSent: messagesSentToTabs,
            sendMessage: async (tabId: number, message: any): Promise<void> => {
                if (tabId < 0) {
                    throw new Error("Expected Failure");
                }

                if (messagesSentToTabs[tabId] === undefined || messagesSentToTabs[tabId] === null) {
                    messagesSentToTabs[tabId] = [];
                }
                
                messagesSentToTabs[tabId].push(message);
                return;
            },
            query: (x: any) => new Promise((resolve, _) => resolve(tabs)),
            update: async (tabId: number, message: chrome.tabs.UpdateProperties): 
            Promise<chrome.tabs.Tab> => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab: chrome.tabs.Tab = tabs[i];
                    if (tab.id === tabId) {
                        tabs[i] = {
                            ...tab,
                            ...message,
                        }

                        return tabs[i];
                    }
                }

                throw 'Updated imaginary tab';
            },
        },
        runtime: {
            onMessage: {
                addListener: <T extends Function>(x: T) => {
                    onMessageListenersList.push(x);
                },
                testExecute: (x: any, y: any, z: any) => {  // my own innovation
                    expect(onMessageListenersList).toHaveLength(1);
                    for (let i = 0; i < onMessageListenersList.length; i++) {
                        const ear = onMessageListenersList[i];
                        ear(x,y,z);
                    }
                }
            },
            getURL: (urlPath: string) => {
                return 'file://' + resolve(PUBLIC_DIR, urlPath);
            },
            messagesSentToWorkerScript: messagesSentToWorkerScript,
            sendMessage(message: any) {
               messagesSentToWorkerScript.push(message);
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
    };
}

let browserInstance = makeMockBrowser();

const browserProxy = new Proxy(browserInstance, {
    get(target, prop) {
        return browserInstance[prop as keyof typeof browserInstance];
    }
});

export default browserProxy;

export function overrideBrowserState(newBrowser: any) {
    browserInstance = newBrowser;
}

function resetBrowser() {
    overrideBrowserState(makeMockBrowser());
}

export const setUpMockBrowser = () => {
    global.fetch = jest.fn((url: string) => {
        // Assuming url uses file:// protocol as in getURL
        const filePath: string = url.replace('file://', '');
        const content = readFileSync(filePath, 'utf-8');
        return Promise.resolve({
            json: () => Promise.resolve({}),
            text: () => Promise.resolve(content),
        })
    }) as jest.Mock; 

    resetBrowser();
}
