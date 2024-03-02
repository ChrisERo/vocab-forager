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

    get(callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: string | string[] | { [key: string]: any; } | null | undefined): Promise<{ [key: string]: any; }>;
    get(keys: string | string[] | { [key: string]: any; } | null, callback: (items: { [key: string]: any; }) => void): void;
    get(keys?: unknown, callback?: unknown): void | Promise<{ [key: string]: any; }> {
        return new Promise<object>((resolve, _) => {
            if (keys == null) {
                resolve({ ...this.storage });
            } else if (typeof keys === 'string' || keys instanceof String) {
                resolve(this.storage[keys as string]);
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
                    returnObject[k] = this.storage[k];
                }

                resolve(returnObject);
            }
        });
    }
}

export const setUpMockBrowser = () => {
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
