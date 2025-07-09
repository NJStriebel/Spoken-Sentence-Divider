import type { TimedTextSegment } from "./TimedTextSegment";
import type { parsingProblem } from "./UnpackBloomFormat";

export async function getProblemFromPangloss(xmlFilePath:string) :Promise<parsingProblem>{
    const segs : TimedTextSegment[] = [];

    const xmlFileResponse = await fetch(xmlFilePath);
    const xmlFileContent = await xmlFileResponse.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlFileContent, "text/xml");

    let i = 0;
    let sentenceID = `S${++i}`;
    let sentenceElement = xmlDoc.getElementById(sentenceID);

    while(sentenceElement != null){
        const times = sentenceElement.querySelector("AUDIO");
        const text = sentenceElement.querySelector("FORM")?.innerHTML!;

        const startTime = parseFloat(times?.getAttribute("start")!);
        const endTime = parseFloat(times?.getAttribute("end")!);

        segs.push({
            start:startTime,
            end:endTime,
            text:text
        })

        sentenceID = `S${++i}`;
        sentenceElement = xmlDoc.getElementById(sentenceID);
    }

    //strip .xml and add .wav
    const audioFilePath = `${xmlFilePath.slice(0, xmlFilePath.length-4)}.wav`

    return({
        audioFileName:audioFilePath,
        targetSegments:segs
    })
}