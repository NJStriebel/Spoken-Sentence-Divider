A development and testing environment for algorithms that identify breaks between phrases and sentences in recorded speech.

Originally developed for Bloom Desktop (https://github.com/BloomBooks/BloomDesktop)

To see the results, run the command "npx vite dev" from the root directory, then open "http://localhost:5173" in a web browser

To see a different page, modify the BOOK_NAME and PAGE_INDEX constants in ./src/entryPoints/onepage.test

The meaning of the parameters/constants at the start of the file can be found in the descriptions of the algorithms that use them in "./Algorithm Documentation.pdf"

To add a book to this tool, hand-align two versions of it - one with the phrase breaks at the beginning of each pause and one with phrase breaks at the end.
place both versions in ./public/data/HandAligned, naming them <BOOK_NAME>-Beginning and <BOOK_NAME>-End respectively
place either book's audio directory in ./public/data/HandAlgined and name it <BOOK_NAME>-Beginning-audio

To run a file in ./src/entryPoints other than onepage.ts, change the src attribute on the script element in ./index.html to point to the desired file path.

onePangloss.ts and TestJobExample.ts were early tests that were later broken by changes to underlying method signatures.