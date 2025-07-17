A development and testing environment for algorithms that identify breaks between phrases and sentences in recorded speech.

Originally developed for Bloom Desktop (https://github.com/BloomBooks/BloomDesktop)

To see the results, run the command "npx vite dev" from the root directory, then open "http://localhost:5173" in a web browser

To see a different page, modify the BOOK_NAME and PAGE_INDEX constants in ./src/entryPoints/onepage.test

To run a different file from the ./src/entryPoints directory, change the src attribute on the script element in ./index.html to point to the desired file path.

onePangloss.ts and TestJobExample.ts were early tests that were later broken by changes to underlying method signatures.