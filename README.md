# VocabForager

VocabForager is a browser extension for people build their vocabulary in one, or numerous,
languages. Users can highlight text on a webpage and look up definitions from \[almost\]
any online dictionary of their choice. Marks are persisted across page visits, giving
users a chance to refresh their lexicon both by rereading the text and by quizzing
themselves.

For more information on how to use VocabForager, please read the [User Manual](./docs/user-manual.md).

## Installation
The standard way of installing this extension is through the
[Chrome Web Store](https://chrome.google.com/webstore/detail/vocabforager/balmgepggidbdfihlbiknlabfnhbahpf).

If this proves difficult, one can download this repository and "build" the extension locally using npm.
```console
npm install  # downloads all dependencies that source code depends on
npm run build-prod  # compiles source code and bundles code and assets into extension directory
```
After doing this, the extension can be installed onto Chrome (or some other Chromium-based browser) by
navigating to `Extensions > Manage Extensions > Load unpacked` and selecting the extension
packaged extension. The exact steps may vary depending on the browser, but the steps the
general steps should be the same.

## Important Notes
- VocabForager tries to load previous marks after webpage has been loaded. Text
that appears on a webpage after page is initially loaded may not get re-highlighted.
- VocabForager can only use online dictionaries if the URL contains the word being searched
and all word searches on the online dictionary have the same structure (see the [manual](./docs/user-manual.md)
for more information. ONline dictionaries that do not follow this convention are not usable.
The vast majority of online-dictionaries we have encountered follow these conventions, so we
do not expect this to be a hinderance for users.