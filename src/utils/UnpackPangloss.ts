import type { TimedTextSegment } from "./TimedTextSegment";
import type { parsingProblem } from "./UnpackBloomFormat";

export async function getProblemFromPangloss(xmlFilePath:string) :Promise<parsingProblem>{
    const segs : TimedTextSegment[] = [];

    const xmlFileResponse = await fetch(xmlFilePath);
    const xmlFileContent = await xmlFileResponse.text();
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlFileContent, "text/xml");

    let sentenceElements = xmlDoc.querySelectorAll("S");

    for(const sentenceElement of sentenceElements){
        const times = sentenceElement.querySelector("AUDIO");
        const textElements = sentenceElement.querySelectorAll("FORM");
        const formKind = textElements[0].getAttribute("kindOf");
        let text = "";

        for(const te of textElements){
            if(te.getAttribute("kindOf") === formKind){
                text = text + te.innerHTML;
            }
        }


        const startTime = parseFloat(times?.getAttribute("start")!);
        const endTime = parseFloat(times?.getAttribute("end")!);

        segs.push({
            start:startTime,
            end:endTime,
            text:text
        })
    }

    //the end of a segment may not perfectly line up with the beginning of the next segment. Fix that.
    for(let i = 0; i < segs.length-1; i++){
        const splitPoint = (segs[i].end + segs[i+1].start) / 2;
        segs[i].end = splitPoint;
        segs[i+1].start = splitPoint;
    }

    //strip .xml and add .wav
    const audioFilePath = `${xmlFilePath.slice(0, xmlFilePath.length-4)}.wav`

    return({
        audioFileName:audioFilePath,
        targetSegments:segs
    })
}

export async function printAeneasFragmentFileTextFromPangloss(xmlFilePath:string){
    const prob = await getProblemFromPangloss(xmlFilePath);

    let result = prob.targetSegments.map(ts=>ts.text).reduce((allFrags, thisFrag, i)=>{
        if(i == 0) return allFrags + thisFrag;
        else return allFrags + "\n" + thisFrag;
    }, "")

    console.log(result);
}