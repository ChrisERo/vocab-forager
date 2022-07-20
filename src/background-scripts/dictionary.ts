import { DictionaryIdentifier as DictionaryIdentifier, Dictionary, getLanguages, GlobalDictionaryData, SubjectToDictsMapping } from '../utils/models';
import {NonVolatileBrowserStorage} from './non-volatile-browser-storage'

/**
 * Class for handleing the creation, deletion, and acquisition of data pertaining to 
 * the many Dicitonaries used in this extension stored in some data source.
 */
export class DictionaryManager {
    // Placeholder for word to look up in URL of some Dictionary
    static wordURLPlaceHolder = '{word}';
    
    source: NonVolatileBrowserStorage;

    constructor(source: NonVolatileBrowserStorage) {
        this.source = source;
    }

    /**
     * Returns array of all languages for which a dictionary exists.
     */
    getLanguages(): string[] {
        let dc: GlobalDictionaryData = this.source.getDictionaryData();
        return getLanguages(dc);
    }

    /**
     * Returns array of all dictionaries of given language.
     * 
     * @param language - language or subject for which to get Dictionaries for
     */
    getDictionariesOfLanguage(language: string): Dictionary[] {
        let dc: GlobalDictionaryData = this.source.getDictionaryData();
        let availableDicts: SubjectToDictsMapping = dc.languagesToResources
        if (availableDicts[language] == null) {
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
        if (dictID.index < dicts.length || dictID.index >= dicts.length) {
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
    getDictionaryFromIdentifier(dictID: DictionaryIdentifier) {
        let dc: GlobalDictionaryData = this.source.getDictionaryData();
        return this.getDictionaryFromIdentifierHelper(dc, dictID);
    }

    /**
     * Equivilant to this.getDictinoaryFromIdentifier whene executed on the 
     * current dictionary's identifier
     * 
     * @returns dictionary to be used for searching currently, or a Dictionary with null
     * values if either current dicitonary is not set or if it references a non-existant
     * Dictionary.
     */
    getCurrentDictionary(): Dictionary {
        let dc: GlobalDictionaryData = this.source.getDictionaryData();
        let currentDictInfo: DictionaryIdentifier = dc.currentDictionary;
        return this.getDictionaryFromIdentifierHelper(dc, currentDictInfo);
    }

    /**
     * Returns url representing page asociated with word using the current dictionary
     * 
     * @param word - word we wish to look up 
     */
    getWordSearchURL(word: string) {
        let currentDict: Dictionary = this.getCurrentDictionary();
        let template = currentDict.url;
        return template.replace(DictionaryManager.wordURLPlaceHolder, word);
    }

    /**
     * Set current_dictionary to a new dictionary represented by language and index (assume
     * such a dictionary exists) and save this change in non-volatile storage
     * 
     * @param chosenDictInfo - data identifying current dicitonary to set
     */
     setcurrentDictinoary(chosenDictInfo: DictionaryIdentifier) {
        let dc: GlobalDictionaryData = this.source.getDictionaryData();
        dc.currentDictionary = chosenDictInfo;
        this.source.setDictionaryData(dc);
    }

    /**
     * Deletes dictionary represented by dictID from non-volatile storage and updates rest
     * of GlobalDicitonaryData based on removal. Returns true if execution did not throw
     * an exception: either by not deleteing anything or by deleteing the specified 
     * dictionary.
     *
     * @param dictID - object with string representing language on dictionary and 
     *                 Number representing index of dictionary to delete
     * @returns false if terminated exceptionally and true otherwise
     */
    removeDictionary(dictID: DictionaryIdentifier): boolean {
        try {
            // Extract identifying components
            let language: string = dictID.language;
            let dict_index: number = dictID.index;
            
            // Remove dictionary referenced by dictID if possible
            let dc: GlobalDictionaryData = this.source.getDictionaryData();
            let dictionaries: SubjectToDictsMapping = dc.languagesToResources;
            let relevantDictionaries: Dictionary[] = dictionaries[language];
            if (relevantDictionaries == null || 
                dict_index < 0 || 
                dict_index >= relevantDictionaries.length) {
                return true;
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
            
            this.source.setDictionaryData(dc);

            return true;
        } catch(err) {
            console.error(err);
            return false;
        }
    }

    /**
     * Updates an existing dictionary entry.
     *
     * @param dictID - reference to the modified dictionary
     * @param newDict - new url and name info of dictionary
     */
    modifyExistingDictionary(dictID: DictionaryIdentifier, newLanguage: string, newDict: Dictionary) {
        if (dictID.language === newLanguage) { // Just update dict's data
            let dc: GlobalDictionaryData = this.source.getDictionaryData();
            let dictionaries: SubjectToDictsMapping = dc.languagesToResources;
            let dictList: Dictionary[] = dictionaries[dictID.language];
            if (dictList == null || 
                dictID.index < 0 || 
                dictID.index >= dictList.length) {  // TODO: make private invalid locaiton function for code reuse
                console.error(`Bad data for ${dictionaries}: ${dictID.language}, ${dictID.index}`)
                return;
            }
            
            dictList[dictID.index] = newDict;
            this.source.setDictionaryData(dc);
        } else {
            // Move dictionary from old language to new language (with edits)
            let successful_delete = this.removeDictionary(dictID); // must get dicts after doing this
            if (successful_delete) {
                let dc: GlobalDictionaryData = this.source.getDictionaryData();
                let dictionaries: SubjectToDictsMapping = dc.languagesToResources;

                // Determine whether to move dictionary to brand new or existing language
                if (dictionaries.hasOwnProperty(newLanguage)) {
                    dictionaries[newLanguage].push(newDict);
                } else {
                    dictionaries[newLanguage] = [newDict];
                }

                // See if current dictionary identifier needs updating
                if (dc.currentDictionary.language === dictID.language &&
                    dc.currentDictionary.index === dictID.index) {
                        dc.currentDictionary.language = newLanguage;
                        dc.currentDictionary.index =  dictionaries[newLanguage].length - 1;
                }

                this.source.setDictionaryData(dc);
            }
        }
    }
}