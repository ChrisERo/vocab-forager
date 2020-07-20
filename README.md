# Vocab Explorer

Vocab Explorer is a Firefox add-on for people trying to build up their vocabulary for one, 
or several, languages. With just a few clicks, users can highlight words and phrases on a 
webpage and search for them in an online dictionary of their choice.

### Activate Addon

To activate Vocab Explorer, either use the add-on's context menu or the toggle button in 
its popup. This will make highlights visible in all webpages and allow user to add/remove 
highlights to/from the page. The same mechanisms can be used to deactivate the add-on, 
causing the opposite effect.

### Highlighting

To highlight parts of a webpage, simply highlight the word(s) you wish to highlight and a 
yellow highlight mark will appear over the selected block of text. Clicking on this text 
opens a new tab where the selected word's definition will appear in the currently-selected 
dictionary.

To delete a highlight mark, simply hover over the selection in question and access the 
add-on's context menu and click the _Delete Highlight_ option.

### Dictionaries

Users can add dictionaries by clicking the _New Dictionary_ button in the add-on's 
popup and filling in the required data in the New Dictionary page. Note what the tooltip
for the _URL Regex_ states; users must provide the URL for searching the text "{word}", 
e.g.  
>[https://www.spanishdict.com/translate/%7Bword%7D](https://www.spanishdict.com/translate/%7Bword%7D)

To select a dictionary, enter the add-on's popup and choose the appropriate language and
dictionary. This will apply to all webpages opened by the user.

### Quiz

Once a user has some text highlighted on a web page, they can quiz themselves on the highlighted vocabulary. To do this, simply select the 
Quiz option in the context menu; a blue modal with a highlighted word in the middle should appear. In the quiz, users can search the definition of the 
current text by simply clicking on it (like highlighted text in a web page). Make sure that Vocab Explorer is activated before selecting the Quiz option, otherwise 
nothing will happen.

### Download
Vocab Explorer is available in Mozila's Add-on website. Click this [link](https://addons.mozilla.org/en-US/firefox/addon/vocab-explorer/) to access it.

### Important Notes
This add-on was built under the assumption that a website becomes static (doesn't load any more elements) after 1 second and that a website'd DOM tree never changes; no elements are ever added, destroyed, or modified between visits. Using this add-on on websites that break this assumption will cause buggy behavior.

I have also observed that at times the the add-on displays a stack trace error message when opening a website while the add-on is activated and highlights have been made. To get around this, try deactivating the add-on, waiting a few seconds/minutes, closing popups, and reactivating it.
