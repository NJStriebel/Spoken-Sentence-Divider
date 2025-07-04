import type { TimedTextSegment } from "../utils/TimedTextSegment";

//estimate by making the naive assumption that each character takes the same amount of time to say.
export function textLength(initialSegments: TimedTextSegment[], audioData: number[], duration: number){
    const totalTextLength :number = initialSegments.reduce((lengthSoFar:number, thisSegment:TimedTextSegment) => {return lengthSoFar + thisSegment.text.length}, 0);

    const segments : TimedTextSegment[] = new Array();
    for(const seg of initialSegments){
        segments.push({
            start:0,
            end:0,
            text:seg.text
        })
    }

    for(let i = 0; i < segments.length-1; i++){
        segments[i].end = segments[i].start + (segments[i].text.length / totalTextLength) * duration;
        segments[i+1].start = segments[i].end;
    }
    segments[segments.length-1].end = duration;

    return segments;
}