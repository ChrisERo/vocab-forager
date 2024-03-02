import { setUpMockBrowser } from "./mocks/chrome";
import { LocalStorage, getLocalStorage } from "./non-volatile-browser-storage";


describe('Test LocalStorage', () => {
    it.each( [
        [false, false],
        [false, true],
        [true, false],
        [true, true],
        [null, false],
        [null, true],
    ])('Test is_activated manupulation %s %s', async (isActivatedOG: boolean | null, newCurrentActivation: boolean) => {
        setUpMockBrowser();
        await chrome.storage.local.set({'is_activated': isActivatedOG});
        const storage: LocalStorage =  getLocalStorage();

        const ogActivationResult = await storage.getCurrentActivation();
        expect(ogActivationResult).toBe(isActivatedOG === null ? false : isActivatedOG);

        await storage.setCurrentActivation(newCurrentActivation);
        const newActivationResult = await storage.getCurrentActivation();
        expect(newActivationResult).toBe(newCurrentActivation);
    });
});