import type { TimedTextSegment } from "./TimedTextSegment";

const HTM_FIELD_NAME = "data-audiorecordingendtimes";
//this property is followed by a string listing n space-separated times
//the same line will have an id property, which is the name of the audio file, minus the ".mp3"
//after that, the sentences/phrases will be the next n innerText attributes

export type parsingProblem = {
    audioFileName:string,
    targetSegments:TimedTextSegment[],
    targetPauses?:TimedTextSegment[]
}

export async function getProblemFromBloom(htmPath:string) : Promise<parsingProblem[]> {
    const htmFileResponse = await fetch(htmPath);
    const htmFileContent = await htmFileResponse.text();

    const parser = new DOMParser();
    const dom = parser.parseFromString(htmFileContent, "text/html");

    const ptcs = dom.getElementsByClassName("bloom-editable audio-sentence bloom-postAudioSplit bloom-visibility-code-on bloom-content1");
    const pageTextContainers = Array.from(ptcs).filter((thisElement)=>thisElement.getAttribute("data-book")!="bookTitle");
    //const pageTextContainers = dom.getElementsByClassName("bloom-editable audio-sentence bloom-postAudioSplit normal-style bloom-visibility-code-on bloom-content1")!; //OG line

    const problems : parsingProblem[] = [];

    for(const pageTextCont of pageTextContainers){
        const afp = `${htmPath.slice(0, htmPath.length-4)}-audio/${pageTextCont.id}.mp3`;

        const endTimesString = pageTextCont.getAttribute(HTM_FIELD_NAME);

        const endTimes = endTimesString?.split(" ").map(parseFloat)!;

        const segments :TimedTextSegment[] = [];
        let segI = 0;
       
        const paragraphContainers = pageTextCont.childNodes!;
        for(const paragraphContainer of paragraphContainers){
            const phraseContainers = paragraphContainer.childNodes!;

            for(const thisContainer of phraseContainers){
                if(thisContainer instanceof HTMLSpanElement){
                    let startT = 0;
                    if(segI > 0) startT = segments[segI-1].end;
                    const seg = {
                        start: startT,
                        end: endTimes[segI],
                        text: thisContainer.innerText
                    }
                    segments.push(seg);
                    segI++;
                }
            }
        }
        if(segments.length != endTimes.length){
            console.warn(`number of text segments (${segments.length}) does not match number of end times (${endTimes.length})`)
        }    

        if(segments.length > 1){
            problems.push({
                audioFileName:afp,
                targetSegments: segments
            })
        }
        else{
            console.warn(`Skipping over a page/textbox with 1 or fewer sentences:`)
            //console.log(segments)
        }
    }

    if(problems.length != pageTextContainers.length){
        console.warn(`${htmPath}\nonly ${problems.length} out of ${pageTextContainers.length} text boxes were successfully parsed`);
    }

    return problems;
}