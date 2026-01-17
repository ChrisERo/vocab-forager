import { readFileSync } from 'fs';
import { resolve } from "path";
import type { Tabs, Storage, Events, Menus } from 'webextension-polyfill';

// Path to public directory (where html and other webpage assets live)
const PUBLIC_DIR = __dirname + '/../../public';

export class MockLocalStorage implements Storage.StorageArea {
    private storage: {[key: string]: any};
    QUOTA_BYTES: number;
    onChanged: Events.Event<(changes: Storage.StorageAreaOnChangedChangesType) => void>;

    constructor() {
        this.storage = {};
        this.QUOTA_BYTES = 1024 * 1024; // 1MB default quota
        this.onChanged = {
            addListener: () => { /* no-op */ },
            removeListener: () => { /* no-op */ },
            hasListener: () => false,
            hasListeners: () => false,
            addRules: () => Promise.resolve([]),
            removeRules: () => Promise.resolve(),
            getRules: () => Promise.resolve([])
        } as unknown as Events.Event<(changes: Storage.StorageAreaOnChangedChangesType) => void>;
    }

    setAccessLevel(accessOptions: { accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" | "TRUSTED_CONTEXTS" }): Promise<void> {
        // No-op for mock
        return Promise.resolve();
    }

    getBytesInUse(callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: string | string[] | null): Promise<number>;
    getBytesInUse(keys: string | string[] | null, callback: (bytesInUse: number) => void): void;
    getBytesInUse(keys?: unknown, callback?: unknown): void | Promise<number> {
        const calculateSize = (keysToCheck: string[]): number => {
            return keysToCheck.reduce((total, key) => {
                const value = this.storage[key];
                if (value !== undefined) {
                    total += JSON.stringify(value).length;
                }
                return total;
            }, 0);
        };

        if (typeof callback === 'function') {
            if (keys === null || keys === undefined) {
                const size = calculateSize(Object.keys(this.storage));
                callback(size);
            } else if (typeof keys === 'string' || Array.isArray(keys)) {
                const keysToCheck = Array.isArray(keys) ? keys : [keys];
                const size = calculateSize(keysToCheck);
                callback(size);
            }
            return;
        }

        return new Promise<number>((resolve) => {
            if (keys === null || keys === undefined) {
                resolve(calculateSize(Object.keys(this.storage)));
            } else if (typeof keys === 'string' || Array.isArray(keys)) {
                const keysToCheck = Array.isArray(keys) ? keys : [keys];
                resolve(calculateSize(keysToCheck));
            } else {
                resolve(0);
            }
        });
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
    const tabs: Tabs.Tab[] = [
        {
            id: 1,
            index: 0,
            pinned: false,
            highlighted: false,
            windowId: 0,
            active: false,
            incognito: false,
            discarded: false,
            autoDiscardable: false,
            groupId: 0
        },
        {
            id: 2,
            index: 1,
            pinned: false,
            windowId: 0,
            active: false,
            incognito: false,
            highlighted: false,
            discarded: false,
            autoDiscardable: false,
            groupId: 0
        },
        {
            id: -13,
            index: 3,
            pinned: false,
            windowId: 0,
            active: false,
            incognito: false,
            highlighted: false,
            discarded: false,
            autoDiscardable: false,
            groupId: 0,
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
            discarded: false,
            autoDiscardable: false,
            groupId: 0
        }
    ];
    const listeners: ((info: Menus.OnClickData, tab?: Tabs.Tab | undefined) => void) [] = [];
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
                addListener: (callback: (info: Menus.OnClickData, tab?: Tabs.Tab | undefined) => any): void => {
                    listeners.push(callback);
                }
            }
        },
        tabs: {
            create: async (message: Tabs.CreateCreatePropertiesType): 
                Promise<Tabs.Tab> => {
                const newId = tabs.length + 1;
                const newTab: Tabs.Tab = {
                    ...message,
                    id: newId,
                    index: 0,
                    pinned: false,
                    highlighted: false,
                    windowId: 0,
                    active: false,
                    incognito: false,
                    discarded: false,
                    autoDiscardable: false,
                    groupId: 0
                }
                tabs.push(newTab);
                return newTab
            },
            get: async (tabId: number): Promise<Tabs.Tab> => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab: Tabs.Tab = tabs[i];
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
            update: async (tabId: number, message: Tabs.UpdateUpdatePropertiesType): 
            Promise<Tabs.Tab> => {
                for (let i = 0; i < tabs.length; i++) {
                    const tab: Tabs.Tab = tabs[i];
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
            },
            session: new MockLocalStorage(),
            managed: new MockLocalStorage(),
            onChanged: {} as Storage.StorageChange,
        }
    };
}

let browserInstance: any = makeMockBrowser();;
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
