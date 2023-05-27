import { QuizManager } from "../content-scripts/quiz";
import { BSMessage, BSMessageType } from "../utils/background-script-communication";
import { SiteData } from "../utils/models";


const SITE_NAME_HEADER= document.getElementById('site-name-header') as HTMLElement;
const LABELS_LIST_SECTION = document.getElementById('labels-list-section') as HTMLDivElement;
const MISSING_WORDS_LIST_SECTION = document.getElementById('missing-words') as HTMLDivElement;
const PRESENT_WORDS_LIST_SECTION = document.getElementById('present-words') as HTMLDivElement;

const LABELS_SECTION = document.getElementById('labels-section') as HTMLDivElement;
const MISSING_WORDS_SECTION = document.getElementById('missing-words-section') as HTMLDivElement;
const PRESENT_WORDS_SECTION = document.getElementById('present-words-section') as HTMLDivElement;

export const QUIZ_BUTTON = document.getElementById('quiz-button') as HTMLElement;


export function setUpEditPage(url: string, siteDataPromise: Promise<SiteData>,
    labelsPromise: Promise<string[]>): void {
        LABELS_SECTION.style.display = 'inline-block';
        PRESENT_WORDS_SECTION.style.display = 'inline-block';
        MISSING_WORDS_SECTION.style.display = 'inline-block';
        QUIZ_BUTTON.style.display = 'inline-block';
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
    QUIZ_BUTTON.style.display = 'none';
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
        createTextEntries(labels, 'labels-list-section', labels, labelsRemoveFunction);
        addPlusSignToLabelsSection(labels, url, labelsRemoveFunction);
}

function addPlusSignToLabelsSection(labels: string[], url: string,
    labelsRemoveFunction: (x: string[], y: number) => void) {
    const containerElement = document.createElement('div');
    containerElement.setAttribute('class', 'word-item')

    const addButton = document.createElement('p');
    addButton.textContent = '+';
    addButton.setAttribute('class', 'add-element-plus add-element-item');
    addButton.addEventListener('click', () => {
        const inputElement = document.getElementById('new-label-id') as HTMLInputElement;
        const content = inputElement.value.trim();  // TODO: add more validation
        if (content.length === 0 || content.length > 24) {
            return;
        }

        labels.push(content);
        const addMsg: BSMessage = {
            messageType: BSMessageType.AddLabelEntry,
            payload: {
                url: url,
                label: content
            }
        };
        chrome.runtime.sendMessage(addMsg);
        createTextEntries(labels, 'labels-list-section', labels, labelsRemoveFunction);
        addPlusSignToLabelsSection(labels, url, labelsRemoveFunction);
    });
    containerElement.append(addButton);

    const text = document.createElement('input');
    text.setAttribute('id', 'new-label-id');
    text.setAttribute('type', 'text');
    text.setAttribute('name', 'new-label-name');
    text.setAttribute('class', 'add-element-item');
    containerElement.append(text);
    LABELS_LIST_SECTION.append(containerElement);
}

async function populateSiteData(url: string,
    siteDataPromise: Promise<SiteData>): Promise<void> {
        const siteData = await siteDataPromise;
        const headerText = siteData.title === undefined ? url : siteData.title;
        SITE_NAME_HEADER.innerHTML = `<a target="_blank" href=${url}>${headerText}</a>`;

        const missingWordEntires: string[] = siteData.missingWords;
        const presentWordEntries: string[] = siteData.wordEntries.map((w) => w.word);
        createTextEntries(presentWordEntries, 'present-words', siteData, (sd: SiteData, i) => {
            sd.wordEntries.splice(i, 1);
            saveSiteData(url, sd);
        });
        createTextEntries(missingWordEntires, 'missing-words', siteData, (sd: SiteData, i) => {
            sd.missingWords.splice(i, 1);
            saveSiteData(url, sd);
        });

        const quizzer = new QuizManager();
        QUIZ_BUTTON.addEventListener('click', () => {
            quizzer.loadQuizHTML(siteData);
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
        divListSection.innerHTML = '';
        for (let i = 0; i < textList.length; i++) {
            const content = textList[i];

            const containerElement = document.createElement('p');
            containerElement.setAttribute('class', 'word-item');

            const closeButton = document.createElement('p');
            closeButton.textContent = 'X';
            closeButton.setAttribute('class', 'delete-x');
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
