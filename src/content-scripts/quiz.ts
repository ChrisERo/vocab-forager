import { SiteData, Word } from "../utils/models";
import { defineWord } from "./utils";

const quizHTMLURL = 'cross-page-assets/quiz.html';  // local url for quiz html data
const quizPopupID = 'quiz_container_box';  // id of div containing quiz in site
const quizCounterID = "quiz_counter";  // id for component of quiz that
const closeButtonID = 'close_the_quiz';  // id for html element used to close popup
const wordQuestionID = 'word_questioning';  // id for element containiner word being questioned currently
const nextButtonID = 'next';  // id for nextElement to click

/**
 * Manages state for quiz popup
 */
export class QuizManager {
    private quizWordList: string[] = [];  // List of words to use for quiz
    private isQuizActive: boolean = false;  // true iff quiz popup is present in page
    private wordsEncountered: number = 0;  // numer of words user has answered in quiz
    private myDomParser = new DOMParser();  // DOM parser used to process html data for quiz

    /**
     * Algorithm with at least O(n) time complexity for randomizing the order of elements of an 
     * array in-place, where n is the number of elements in the array
     * 
     * @param array - some array
     */
    shuffle(array: any[]) {
        let ni: number;
        let temp: any;
        for (let i = 0; i < array.length; i++) {
            ni = Math.floor(Math.random() * array.length);
            temp = array[i];
            array[i] = array[ni];
            array[ni] = temp;
        }
    }

    /**
     * Converts html data (as string) into elements
     *
     * Code obtained from
     * https://gomakethings.com/converting-a-string-into-markup-with-vanilla-js/
     *
     * @param {String} str - html text to be converted to objects
     */
    private stringToElement(htmlData: string) {
        let doc: Document = this.myDomParser.parseFromString(htmlData, 'text/html');
        return doc.body.childNodes[0]; // Just get content of body (one main element)
    }

    /**
     * Creates empty html element containing quiz popul and places at bottom of HTML page
     * @returns empty html element used as container for quiz popup
     */
    addQuizContainer(): HTMLElement {
        let quizContainer = document.createElement('div');
        quizContainer.id = quizPopupID;
        quizContainer.setAttribute('class', 'dark_screen');
        document.body.appendChild(quizContainer);
        return quizContainer;
    }

    updateQuizCounter() {
        let counterIDElement = document.getElementById(quizCounterID);
        if (counterIDElement === null ) {
            console.error(`Could not find element ${quizCounterID}. 
                Check that quiz div was loaded propperly and contains an element with that id`)
            return;
        }
       counterIDElement .textContent = `${this.wordsEncountered}/${this.wordsEncountered + this.quizWordList.length - 1}`;
    }

    /**
     * Creates the list of words that quiz should use and initialises the counter element
     * of quiz popup
     *
     * @param siteData - metadata pertaining to a particular url; contains data used for making quiz
     */
    setUpWordsAndCounter(siteData: SiteData): void {
        this.quizWordList = [];
        // Get list of words to quiz on
        for (let i = 0; i < siteData.wordEntries.length; i++) {
            let entry: Word = siteData.wordEntries[i];
            this.quizWordList.push(entry.word);
        }
        for (let i = 0; i < siteData.missingWords.length; i++) {
            this.quizWordList.push(siteData.missingWords[i]);
        }
        this.shuffle(this.quizWordList);

        // Populate metadata
        this.wordsEncountered = 1;
        this.updateQuizCounter();
    }

    /**
     * Initalises list of words to quiz user one and sets listeners for elemetns 
     * inside quiz container box
     *
     * @param {Object} siteData - vocabulary data pertaining to current web page
     */
    setUpQuiz(siteData: SiteData, quizContainer: HTMLElement) {
        this.setUpWordsAndCounter(siteData);

        // Setup for close button
        let close = document.getElementById(closeButtonID);
        if (close === null) {
            console.error(`Could not find element ${closeButtonID}. 
                Check that quiz div was loaded propperly and contains an element with that id`)
            return;
        }
        close.addEventListener('click', () => {
            if (quizContainer.parentNode !== null) {
                quizContainer.parentNode.removeChild(quizContainer);
            }
            this.isQuizActive = false;
        });

        // Setup for how to respond when word is clicked
        let word = document.getElementById(wordQuestionID);
        if (word === null) {
            console.error(`Could not find element ${wordQuestionID}. 
            Check that quiz div was loaded propperly and contains an element with that id`)
            return;
        }
        word.textContent = this.quizWordList[this.quizWordList.length - 1];
        word.addEventListener('click', () => {
            let text = (word as HTMLElement).textContent;
            defineWord(text);
        });

        let nextButton = document.getElementById(nextButtonID);
        if (nextButton === null) {
            console.error(`Could not find element ${nextButtonID}. 
                Check that quiz div was loaded propperly and contains an element with that id`)
            return;
        }
        nextButton.addEventListener('click', () => {
            this.quizWordList.pop();
            if (this.quizWordList.length === 0) {
                this.setUpWordsAndCounter(siteData);  // reset counter and shuffle quiz questinos
            } else {
                this.wordsEncountered++;
                this.updateQuizCounter();
            }

            (word as HTMLElement).textContent = this.quizWordList[this.quizWordList.length - 1];
        });
        this.isQuizActive = true;
    }

    /**
     * Fetches html for quiz elements and inserts them into current web page, then adds
     * actions and appropriate metadata
     *
     * @param siteData
     */
    loadQuizHTML(siteData: SiteData) {
        if (!this.isQuizActive && 
            siteData.wordEntries.length + siteData.wordEntries.length > 0) {
            fetch(chrome.runtime.getURL(quizHTMLURL))
                .then((response: Response) => response.text())
                .then((html: string) => {
                    let quizContainer: HTMLElement = this.addQuizContainer();
                    let quizPageData = this.stringToElement(html);
                    quizContainer.appendChild(quizPageData);
                    this.setUpQuiz(siteData, quizContainer);
            });
        }
    }
}