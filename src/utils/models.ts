/**
 * Structure used to represent a single word in a webpage that should be highlighted.
 */
export interface Word {
    // text enclosed within word object
    word: string;
    // offsets of first and last character in their respective DOM Node
    startOffset: number;
    endOffset: number;
    // in-order list of nodes that contain word parameter in its entirety. Each node is 
    // represented as its index in the parent nodes list of children
    nodePath: number[][];
}

/**
 * Creates Word object from
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
 * Includes data used to change highlight styling
 * 
 * Important implementation limitation of feature described here:
 * https://betterprogramming.pub/how-to-fix-the-failed-to-read-the-cssrules-property-from-cssstylesheet-error-431d84e4a139
 * https://stackoverflow.com/questions/49993633/uncaught-domexception-failed-to-read-the-cssrules-property
 */
export interface HighlightOptions {
    fontColor: string;
    backgroundColor: string;
}

export function isHighlightOption(data: any): data is SiteData {
    const temp = data as HighlightOptions;
    return temp != null && temp.fontColor !== undefined && temp.backgroundColor !== undefined;
} 

/**
 * Representation of all data associated with specific web URL
 */
export interface SiteData {
    // list of texts in current site that were last highlighted. ID of highlighted text 
    // corresponds to position in array 
    wordEntries: Word[];
    // list of words to look for in site; e.g. words that we expected to find but did not
    missingWords: string[];
    // style options
    highlightOptions?: HighlightOptions;
    // title of website if one exists
    title?: string;
}

export function isSiteData(data: any): data is SiteData {
    const temp = data as SiteData;
    return temp != null && temp.wordEntries !== undefined && temp.missingWords !== undefined &&
        (temp.highlightOptions === undefined || isHighlightOption(temp.highlightOptions));
} 

/**
 * @param highlightOptions 
 * @returns true if options corresponds to light-mode, false otherwise
 */
export function isHighlightLight(highlightOptions?: HighlightOptions): boolean {
    return highlightOptions !== undefined && highlightOptions.fontColor === '#000000'
        && highlightOptions.backgroundColor === '#ffff01';
}

/**
 * Change highlights for a light webpage (yellow background with black text)
 * 
 * @param options current style options for a webpage
 */
export function enforceExplicityLightMode(options?: HighlightOptions): HighlightOptions {
    return setSiteDataHighlightOptions(options, '#ffff01', '#000000');
}

/**
 * Change highlights for a dark webpage (blue background with white text)
 *
 * @param options current style options
 */
export function enforceExplicityDarkMode(options?: HighlightOptions): HighlightOptions {
    return setSiteDataHighlightOptions(options, '#0008fa', '#ffffff');
}

/**
 * Set style options for background and font color for highlighted text.
 *
 * @param options 
 * @param backgroundColor 
 * @param fontColor 
 */
function setSiteDataHighlightOptions(options: HighlightOptions | undefined, backgroundColor: string, fontColor: string): HighlightOptions {
    if (!options) {
        return {
            fontColor: fontColor,
            backgroundColor: backgroundColor
        };
    } else {
        options.backgroundColor = backgroundColor;
        options.fontColor = fontColor;
        return options;
    }
}

export function isEmpty(data: SiteData): boolean {
    return data.wordEntries.length === 0 && data.missingWords.length === 0;
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
 * Mapping form unique strings, which correspond to languages, or subjects, to Dictionaries
 * associated with those subjects. For instance, one can have "spanish" as a subject and
 * two dictionaries, one associated with https://dle.rae.es and another with 
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
    return dict != null && dict.language !== undefined && dict.index !== undefined;
}

/**
 * Type guard for Dictionary interface
 * 
 * @param dict object whose type we want to check
 * @returns true if dict is a Dictionary and false otherwise
 */
export function isDictionary(dict: any): dict is Dictionary {
    let temp = dict as Dictionary;
    return temp != null && temp.name !== undefined && temp.url !== undefined;
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

/**
 * Object representing information on a website needed for see-sites page
 */
export interface SeeSiteData {
    url: string,
    title?: string,
}

