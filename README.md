# VocabForager

VocabForager is a Chrome extension for people trying to build up their vocabulary for one, 
or several, languages. Users can highlight words and phrases on a webpage and search for
them in an online dictionary of their choice.

### Activate Addon

To activate VocabForager, either use the extension's context menu or the toggle button in 
its popup. This will make highlights visible in all webpages and allow user to add/remove 
highlights to/from the page. The same mechanisms can be used to deactivate the extension, 
causing the opposite effect(s).

### Highlighting

To highlight parts of a webpage, simply highlight the word(s) you wish to highlight and a 
yellow highlight mark will appear over the selected block of text. Clicking on this text 
opens a new tab where the selections definition will appear in the currently selected 
dictionary.

To delete a highlight mark, simply hover over the selection in question and access the 
add-on's context menu and click the _Delete Highlight_ option.

### Dictionaries

Users can add dictionaries by clicking the _New Dictionary_ button in the add-on's 
popup and filling in the required data in the New Dictionary page. Note what the tooltip
for the _URL Regex_ states; users must provide the URL for searching the text "{word}", 
e.g.  __https://www.spanishdict.com/translate/{word}__

To select a dictionary, enter the extension's popup and choose the appropriate language and
dictionary. This will apply to all webpages opened by the user.

### Quiz

Once a user has some text highlighted in a web page, they can quiz themselves on the highlighted vocabulary. To do this, simply select the 
Quiz option in the context menu; a blue modal with a highlighted word in the middle should appear. In the quiz, users can search the definition of the 
current text by simply clicking on it (like highlighted text in a web page). Make sure that VocabForager is activated before selecting the Quiz option, otherwise 
nothing will happen.

### Download
WORK IN PROGRESS

### Important Notes
This extension built under the assumption that a website becomes static (doesn't load any more elements) after 1 second and that a website'd DOM tree never changes; no elements are ever added, destroyed, or modified between visits. Using this extension on websites that break this assumption will cause buggy behavior.
