import type { TimedTextSegment } from "./TimedTextSegment";

export async function ttsFromAeneasOutput(aeneasOutputFile:string):Promise<TimedTextSegment[]>{
    const result: TimedTextSegment[] = [];
    
    const response = await fetch(aeneasOutputFile);
    const fileText = await response.text();

    const lines = fileText.split("\n");

    for(let i = 0; i < lines.length; i++){
        const words = lines[i].split(" ");
        let startTime = parseFloat(words[1]);
        if(i==0) startTime = 0; //aeneas doesn't always start at 0
        const endTime = parseFloat(words[2]);

        //leave off the quotation marks
        const match = lines[i].match(/"(.*)"/)!;
        const text = match[1];

        result.push({
            start:startTime,
            end:endTime,
            text:text
        })
    }
    return result;
}