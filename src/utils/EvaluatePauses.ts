import type {TimedTextSegment } from "./TimedTextSegment";

export type pausesResult = {
    pauses:TimedTextSegment[],
    actualNumPauses:number,   
    predictedNumPauses:number, 
    numCorrectIdentified:number
}

export function evaluatePauses(pauseIntervals:TimedTextSegment[], targetRegions:TimedTextSegment[]):pausesResult{
    //the intervals in pauseIntervals correspond to the beginning and end of each pause
    //the intervals in targetRegions correspond to the beginning and end of each phrase.
    //so a correctly identified pause is one where the split between two target regions falls within a pause region.
    const predictedNumPauses = pauseIntervals.length;
    const actualNumPauses = targetRegions.length - 1; //the end of the last region is not a split between phrases
    let numCorrectIdentified = 0;

    let pauseI = 0;
    let regionI = 0;

    while(pauseI < pauseIntervals.length && regionI < targetRegions.length-1){
        if(pauseIntervals[pauseI].start <= targetRegions[regionI].end && pauseIntervals[pauseI].end >= targetRegions[regionI].end){
            numCorrectIdentified++;
            pauseI++;
            regionI++;
        }
        else if(pauseIntervals[pauseI].start > targetRegions[regionI].end){
            regionI++;
        }
        else if(pauseIntervals[pauseI].end < targetRegions[regionI].end){
            pauseI++;
        }
    }

    return{
        numCorrectIdentified:numCorrectIdentified,
        actualNumPauses:actualNumPauses,
        predictedNumPauses:predictedNumPauses,
        pauses:pauseIntervals
    }
}