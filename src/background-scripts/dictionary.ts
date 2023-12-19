import { DictionaryIdentifier, Dictionary, getLanguages, GlobalDictionaryData, SubjectToDictsMapping } from '../utils/models';
import {NonVolatileBrowserStorage} from './non-volatile-browser-storage'

/**
 * Class for handleing the creation, deletion, and acquisition of data pertaining to
 * the many Dicitonaries used in this extension stored in some data source.
 */
export class DictionaryManager {
    // Placeholder for word to look up in URL of some Dictionary
    static wordURLPlaceHolder = '{word}';
    static wordURLPlaceHolderRegex = new RegExp(DictionaryManager.wordURLPlaceHolder, 'g');

    source: NonVolatileBrowserStorage;

    constructor(source: NonVolatileBrowserStorage) {
        this.source = source;
    }

    /**
     * Returns array of all languages for which a dictionary exists.
     */
    async getLanguages(): Promise<string[]> {
        let dc = await this.source.getDictionaryData();
        return getLanguages(dc);
    }

    /**
     * Returns array of all dictionaries of given language.
     *
     * @param language - language or subject for which to get Dictionaries for
     */
    async getDictionariesOfLanguage(language: string): Promise<Dictionary[]> {
        let dc: GlobalDictionaryData = await this.source.getDictionaryData();
        let availableDicts: SubjectToDictsMapping = dc.languagesToResources
        if (availableDicts[language] === undefined) {
            return [];
        }

        return availableDicts[language];
    }


    /**
     * Takes in a DictionaryIdentifier and outputs the dicitonary corresponding to it in
     * some GlobalDictionaryData object, or some null-valued Dictionary if no such
     * Dictionary exists.
     *
     * @param dc
     * @param dictID
     * @return Dictionary corresponding to dictID inside dc, or null if no such Dicitonary exists
     */
    private getDictionaryFromIdentifierHelper(dc: GlobalDictionaryData, dictID: DictionaryIdentifier): Dictionary {
        let dictionaries: SubjectToDictsMapping = dc.languagesToResources;
        if (dictID.language === undefined || dictID.index < 0 ||
            dictionaries[dictID.language] == null) {
            return {name: '', url: ''};
        }

        let dicts: Dictionary[] = dictionaries[dictID.language];
        if (dictID.index < 0 || dictID.index >= dicts.length) {
            return {name: '', url: ''};
        }

        return dicts[dictID.index];
    }


    /**
     * Takes in a DictionaryIdentifier and outputs the dicitonary corresponding to it, or
     * some null-valued Dictionary.
     *
     * @param dictID
     */
    async getDictionaryFromIdentifier(dictID: DictionaryIdentifier): Promise<Dictionary> {
        let dc: GlobalDictionaryData = await this.source.getDictionaryData();
        return this.getDictionaryFromIdentifierHelper(dc, dictID);
    }

    /**
     * Returns current dictionary's identifier
     *
     * @returns dictionary to be used for searching currently, or a Dictionary with null
     * values if either current dicitonary is not set or if it references a non-existant
     * Dictionary.
     */
    async getCurrentDictionaryId(): Promise<DictionaryIdentifier> {
        return (await this.source.getDictionaryData()).currentDictionary;
    }

    /**
     * Returns url representing page asociated with word using the current dictionary
     *
     * @param word - word we wish to look up
     */
    async getWordSearchURL(word: string): Promise<string> {
        const dc: GlobalDictionaryData = await this.source.getDictionaryData();
        const currentDic: Dictionary = this.getDictionaryFromIdentifierHelper(dc, dc.currentDictionary);
        const template: string = currentDic.url;
        return template.replace(DictionaryManager.wordURLPlaceHolderRegex, word);
    }

    /**
     * Set current_dictionary to a new dictionary represented by language and index (assume
     * such a dictionary exists) and save this change in non-volatile storage
     *
     * @param chosenDictInfo - data identifying current dictionary to set
     */
     async setCurrentDictionary(chosenDictInfo: DictionaryIdentifier): Promise<void> {
        let dc: GlobalDictionaryData = await this.source.getDictionaryData();
        dc.currentDictionary = chosenDictInfo;
        this.source.setDictionaryData(dc);
    }

    /**
     * Deletes dictionary represented by dictID from non-volatile storage and updates rest
     * of {@link GlobalDictionaryData} based on removal. Returns true if execution did not
     * throw an exception and results in the removal of a dictionary.
     *
     * @param dictID - object with string representing language on dictionary and
     *                 Number representing index of dictionary to delete
     * @returns false if terminated exceptionally or if no data was removed and true otherwise
     */
    async removeDictionary(dictID: DictionaryIdentifier): Promise<boolean> {
        try {
            // Extract identifying components
            const language: string = dictID.language;
            const dict_index: number = dictID.index;

            // Remove dictionary referenced by dictID if possible
            const dc: GlobalDictionaryData = await this.source.getDictionaryData();
            const dictionaries: SubjectToDictsMapping = dc.languagesToResources;
            const relevantDictionaries: Dictionary[] = dictionaries[language];
            if (relevantDictionaries == null ||
                dict_index < 0 ||
                dict_index >= relevantDictionaries.length) {
                return false;
            }
            dictionaries[language].splice(dict_index, 1);

            // Update current dictionary if we've affected it's location, either leaving as is,
            // shifting index, or completely removing based on what makes sense
            if (dc.currentDictionary.language === dictID.language) {
                if (dc.currentDictionary.index === dictID.index) {
                    dc.currentDictionary.language = '';
                    dc.currentDictionary.index = -1;
                } else if (dc.currentDictionary.index > dictID.index) {
                    dc.currentDictionary.index--;
                }
            }

            // Remove subject from SubjectToDictsMapping if it is empty
            if (dictionaries[language].length === 0) {
                delete dictionaries[language];
            }

            this.source.setDictionaryData(dc);  // persist changes to disk
            return true;
        } catch(err) {
            console.error(err);
            return false;
        }
    }

    /**
     * Adds dictionary to non-volatile storage
     *
     * @param dict Dictionary to add
     * @param lang language that dict is for
     */
    async addDictionary(dict: Dictionary, lang: string): Promise<void> {
        const dc: GlobalDictionaryData = await this.source.getDictionaryData();
        if (Object.keys(dc.languagesToResources).length === 0) {
            dc.currentDictionary = {language: lang, index: 0};
        }

        if (dc.languagesToResources[lang] === undefined) {
            dc.languagesToResources[lang] = [];
        }
        const dictsForLang: Dictionary[] = dc.languagesToResources[lang];
        dictsForLang.push(dict);

        this.source.setDictionaryData(dc);
    }

    /**
     * Updates an existing dictionary entry.
     *
     * @param dictID - reference to the modified dictionary
     * @param newDict - new url and name info of dictionary
     */
    async modifyExistingDictionary(dictID: DictionaryIdentifier, newLanguage: string, newDict: Dictionary): Promise<void> {
        if (dictID.language === newLanguage) { // Just update dict's data
            let dc: GlobalDictionaryData = await this.source.getDictionaryData();
            let dictionaries: SubjectToDictsMapping = dc.languagesToResources;
            let dictList: Dictionary[] = dictionaries[dictID.language];
            if (dictList === null ||
                dictID.index < 0 ||
                dictID.index >= dictList.length) {  // TODO: make private invalid locaiton function for code reuse
                console.error(`Bad data for ${dictionaries}: ${dictID.language}, ${dictID.index}`)
                return;
            }

            dictList[dictID.index] = newDict;
            this.source.setDictionaryData(dc);
        } else {
            // Store important current state before any modification
            let dc: GlobalDictionaryData = await this.source.getDictionaryData();
            const oldCurrentDictLanguage = dc.currentDictionary.language;
            const oldCurrentDictIndex = dc.currentDictionary.index;

            // Move dictionary from old language to new language (with edits)
            let successful_delete = await this.removeDictionary(dictID); // must get dicts after doing this
            if (successful_delete) {
                dc = await this.source.getDictionaryData();
                let dictionaries: SubjectToDictsMapping = dc.languagesToResources;

                // Determine whether to move/insert dictionary to brand new or existing language
                if (dictionaries.hasOwnProperty(newLanguage)) {
                    dictionaries[newLanguage].push(newDict);
                } else {
                    dictionaries[newLanguage] = [newDict];
                }

                // See if "current" dictionary identifier needs updating
                if (oldCurrentDictLanguage === dictID.language) {
                    if (oldCurrentDictIndex === dictID.index) {  // references same dictionary, so make new value
                        dc.currentDictionary.language = newLanguage;
                        dc.currentDictionary.index =  dictionaries[newLanguage].length - 1;
                    } else if (oldCurrentDictIndex > dictID.index) {  // references different dictionary, so adjust to point to same value
                        dc.currentDictionary.index = oldCurrentDictIndex - 1;
                    }
                }

                this.source.setDictionaryData(dc);
            }
        }
    }
}
