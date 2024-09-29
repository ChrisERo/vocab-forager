import { setUpMockBrowser } from "../background-scripts/mocks/chrome";
import { defineWord } from "./utils";
import { BSMessage, BSMessagePayload, BSMessageType, isBsMessage, isSearchRequest, SearchRequest } from "../utils/background-script-communication";

describe('Contextmenu Tests', () => {

    it.each([
            [null, false],
            ['', false],
            [' ', true],
            ['hola', true],
            ['नमस्ते', true],
            ['good day', true],
            ['좋은 아침이에요', true],
        ])('defineWord', (word: string|null, 
                          shouldHaveSent: boolean) => {
            setUpMockBrowser();
            const messageQueue: any[] = (chrome.runtime as any)
                .messagesSentToWorkerScript;
            const originalQueueSize = messageQueue.length;
            
            defineWord(word);

            if (shouldHaveSent) {
                expect(messageQueue).toHaveLength(originalQueueSize + 1);
                const rawMessage: any = messageQueue[originalQueueSize];
                expect(isBsMessage(rawMessage)).toBeTruthy();
                const mssg: BSMessage = rawMessage;
                expect(mssg.messageType).toBe(BSMessageType.SearchWordURL)
                const payload: BSMessagePayload = mssg.payload
                expect(isSearchRequest(payload)).toBeTruthy();
                expect((payload as SearchRequest).word).toBe(word);
            } else {
                expect(messageQueue).toHaveLength(originalQueueSize);
            }
        });
});
