# VocabForager

VocabForager is a browser extension for people build their vocabulary in one, or numerous,
languages. Users can highlight text on a webpage and look up definitions from \[almost\]
any online dictionary of their choice. Marks are persisted across page visits, giving
users a chance to refresh their lexicon both by rereading the text and by quizzing
themselves.

## Activate Addon

To activate VocabForager, either use the extension's context menu or the toggle button in
its popup. This will make highlights visible in all webpages and allow user to add/remove
highlights to/from the page. The same mechanisms can be used to deactivate the extension,
causing the opposite effect(s).

## Highlighting

To highlight parts of a webpage, simply highlight the word(s) you wish to highlight and a
yellow highlight mark will appear over the selected block of text. Clicking on this text
opens a new tab where the selections definition will appear in the currently selected
dictionary.

To delete a highlight mark, simply hover over the selection in question and access the
add-on's context menu and click the _Delete Highlight_ option.

## Quiz

Once a user has some text highlighted in a web page, they can quiz themselves on the highlighted vocabulary. To do this, simply select the
Quiz option in the context menu; a blue modal with a highlighted word in the middle should appear. In the quiz, users can search the definition of the
current text by simply clicking on it (like highlighted text in a web page). Make sure that VocabForager is activated before selecting the Quiz option, otherwise
nothing will happen.

## Installation
The standard way of installing this extension is through the
[Chrome Web Store](https://chrome.google.com/webstore/detail/vocabforager/balmgepggidbdfihlbiknlabfnhbahpf).

Alternatively, one can download this repository and "build" the extension locally using npm:
```console
npm install  # downloads all dependencies that source code depends on
npm run build-prod  # compiles source code and bundles code and assets into extension directory
```
After doing this, the extension can be installed onto Chrome (or some other Chromium-based browser) by
navigating to `Extensions > Manage Extensions > Load unpacked` and selecting the extension packaged extension

## Important Notes
- VocabForager tries to load previous marks after webpage has been loaded. Text
that appears on a webpage after page is initially loaded may not get re-highlighted.
- VocabForager can only use online dictionaries if the URL contains the word being searched
and all word searches on the online dictionary have the same structure (see the [manual](./docs/user-manual.md)
for more information. ONline dictionaries that do not follow this convention are not usable.
The vast majority of online-dictionaries we have encountered follow these conventions, so we
do not expect this to be a hinderance for users.