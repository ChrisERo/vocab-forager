/**
 * Structure used to represent a single word in a webpage that should be highlighted.
 */
export interface Word {
    // text enclosed within word object
    word: string;
    // offsets of first and last character in their respective DOM Node
    startOffset: number;
    endOffset: number;
    // in-order list of nodes that contain word parameter in its entirity. Each node is 
    // represented as the path to it from 
    nodePath: number[][];
}

/**
 * Creats Word object from 
 * 
 * @param w text of Word interface
 * @param startOffset 
 * @param endOffset 
 * @param nodePath 
 * @returns Word object
 */
export function wordFromComponents(w: string, startOffset: number, endOffset: number, nodePath: number[][]): Word {
    return {
        word: w,
        startOffset: startOffset,
        endOffset: endOffset,
        nodePath: nodePath,
    }
}

/**
 * Representation of all data asociated with specfic web URL 
 */
export interface SiteData {
    // list of texts in current site that were last highlighted. ID of highlighted text 
    // corresponds to position in array 
    wordEntries: Word[];
    // list of words to look for in site; e.g. words that we expected to find but did not
    missingWords: string[];
}

/**
 * Object used to query for the meanings, of words, or more generally, web pages with
 * data pertinent to some word or term
 */
export interface Dictionary {
    name: string;
    url: string;
}

/**
 * Mapping form unique strings, which correspond to langauges, or subjects, to Dicitonaries
 * asociated with thos subjects. For instance, one can have "spanish" as a subject and
 * two dicitonaries, one asociated with https://dle.rae.es and another with 
 * https://www.spanishdict.com.
 */
export type SubjectToDictsMapping = { [subject: string]: Dictionary[] };

/**
 * Data used to locate dictionary inside a SubjectToDictsMapping
 */
export interface DictionaryIdentifier {
    language: string;  // language in which current dicitonary belongs to
    index: number;  // index in SubjectToDictsMapping entry for lanaguage corresponding to dictionary to use currently
}

export function isDictionaryID(obj: any): obj is DictionaryIdentifier {
    let dict = obj as DictionaryIdentifier;
    return dict.language !== undefined && dict.index !== undefined;
}

/**
 * @param di dictionary identifier to check
 * @returns true if di represents a null value and false otherwise
 */
export function isNullDictionaryID(di: DictionaryIdentifier): boolean {
    return di.index === -1 && di.language.length === 0;
}


/**
 * Object representing all the dictionary data common for all websites
 */
export interface GlobalDictionaryData {
    languagesToResources: SubjectToDictsMapping;
    currentDictionary: DictionaryIdentifier;
}

export function getLanguages(dc: GlobalDictionaryData): string[] {
    let mapping: SubjectToDictsMapping = dc.languagesToResources;
    return Object.getOwnPropertyNames(mapping);
}