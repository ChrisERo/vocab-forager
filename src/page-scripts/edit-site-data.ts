import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { SiteData } from "../utils/models";


const SITE_NAME_HEADER= document.getElementById('site-name-header') as HTMLElement;
const LABELS_LIST_SECTION = document.getElementById('labels') as HTMLDivElement;
const MISSING_WORDS_LIST_SECTION = document.getElementById('missing-words') as HTMLDivElement;
const PRESENT_WORDS_LIST_SECTION = document.getElementById('present-words') as HTMLDivElement;

const LABELS_SECTION = document.getElementById('labels-section') as HTMLDivElement;
const MISSING_WORDS_SECTION = document.getElementById('missing-words-section') as HTMLDivElement;
const PRESENT_WORDS_SECTION = document.getElementById('present-words-section') as HTMLDivElement;



export function setUpEditPage(url: string, siteDataPromise: Promise<SiteData>,
    labelsPromise: Promise<string[]>): void {
        LABELS_SECTION.style.display = 'in-block';
        PRESENT_WORDS_SECTION.style.display = 'in-block';
        MISSING_WORDS_SECTION.style.display = 'in-block';

        populateLabelsData(url, labelsPromise);
        populateSiteData(url, siteDataPromise);
}

export function clearEditPageComponents(): void {
    SITE_NAME_HEADER.innerHTML = '';
    LABELS_LIST_SECTION.innerHTML = '';
    PRESENT_WORDS_LIST_SECTION.innerHTML = '';
    MISSING_WORDS_LIST_SECTION.innerHTML = '';
    LABELS_SECTION.style.display = 'none';
    PRESENT_WORDS_SECTION.style.display = 'none';
    MISSING_WORDS_SECTION.style.display = 'none';
}

async function populateLabelsData(url: string,
    labelsPromise: Promise<string[]>): Promise<void> {
        const labels = await labelsPromise;
        const labelsRemoveFunction = (l: string[], i: number) => {
            const label = labels[i];
            l.splice(i, 1);
            const removeMsg: BSMessage = {
                messageType: BSMessageType.RemoveLabelEntry,
                payload: {
                    url: url,
                    label: label
                }
            };
            chrome.runtime.sendMessage(removeMsg);
        };
        createTextEntries(labels, 'labels', labels, labelsRemoveFunction);

        const containerElement  = document.createElement('div');
        const addButton = document.createElement('p');
        addButton.textContent = '+';
        addButton.setAttribute('color', '#00FF00');
        addButton.addEventListener('click', () => {
            const inputElement = document.getElementById('new-label-id') as HTMLInputElement;
            const content = inputElement.value.trim();  // TODO: add more validation
            if (content.length === 0) {
                return;
            }
            createTextEntries([content], 'labels', labels, labelsRemoveFunction);

            labels.push(content);
            const addMsg: BSMessage = {
                messageType: BSMessageType.AddLabelEntry,
                payload: {
                    url: url,
                    label: content
                }
            };
            chrome.runtime.sendMessage(addMsg);
        });
        containerElement.append(addButton);

        const text = document.createElement('input');
        text.setAttribute('id', 'new-label-id');
        text.setAttribute('type', 'text');
        text.setAttribute('name', 'new-label-name');
        containerElement.append(text);
}

async function populateSiteData(url: string,
    siteDataPromise: Promise<SiteData>): Promise<void> {
        const siteData = await siteDataPromise;
        SITE_NAME_HEADER.innerHTML = siteData.title === undefined ? url : siteData.title;

        const missingWordEntires: string[] = siteData.missingWords;
        const presentWordEntries: string[] = siteData.wordEntries.map((w) => w.word);
        createTextEntries(missingWordEntires, 'missing-words', siteData, (sd: SiteData, i) => {
            sd.missingWords.splice(i, 1);
            saveSiteData(url, sd);
        });
        createTextEntries(presentWordEntries, 'present-words', siteData, (sd: SiteData, i) => {
            sd.wordEntries.splice(i, 1);
            saveSiteData(url, sd);
        });
}

function saveSiteData(url: string, siteData: SiteData): void {
    const msg: BSMessage = {
        messageType: BSMessageType.StorePageData,
        payload: {
            url: url,
            data: siteData
        }
    };
    chrome.runtime.sendMessage(msg);
}

function createTextEntries<T>(textList: string[], divListElementSectionId: string,
    data: T, removeMetaFunction: (x: T, y: number) => void ): void {
        const divListSection = document.getElementById(divListElementSectionId) as HTMLDivElement;
        for (let i = 0; i < textList.length; i++) {
            const content = textList[i];

            const containerElement  = document.createElement('div');
            const closeButton = document.createElement('p');
            closeButton.textContent = 'X';
            closeButton.setAttribute('color', '#FF0000');
            containerElement.append(closeButton);

            const text = document.createElement('p');  // TODO: make this input? or editable some other way
            text.textContent = content;
            containerElement.append(text);

            divListSection.append(containerElement);
            closeButton.addEventListener('click', () => {
                containerElement.remove();
                removeMetaFunction(data, i);
            });
        }
}
