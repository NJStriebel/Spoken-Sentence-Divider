import { errorsOnSegmentation } from "./ErrorCalc";
import type { TimedTextSegment } from "./TimedTextSegment";

type pauseMapping = {
    pauseIndex:number,
    guessIndex?:number,
    targetIndex?:number
}

//if given the pauses, return the number of splits where the target and the guess are within the same pause
//otherwise, return the mean squared error
export function evaluateSplits(guessRegions:TimedTextSegment[], targetRegions:TimedTextSegment[], pauses:TimedTextSegment[]=[]):number{
    if(pauses.length == 0){
        const squaredErrors = errorsOnSegmentation(guessRegions, targetRegions).map(error=>error**2);
        return squaredErrors.reduce((total, current)=>{return total+current},0) / (guessRegions.length-1);
    }

    const pauseMap : pauseMapping[] = pauses.map((pause, i)=>{return{
        pauseIndex:i
    }});

    let pauseI = 0;
    let guessI = 0;
    while(pauseI < pauses.length && guessI < targetRegions.length-1){
        if(pauses[pauseI].start < guessRegions[guessI].end && pauses[pauseI].end > guessRegions[guessI].end){
            pauseMap[pauseI].guessIndex = guessI;
            pauseI++;
            guessI++;
        }
        else if(pauses[pauseI].start > guessRegions[guessI].end){
            guessI++;
        }
        else if(pauses[pauseI].end < guessRegions[guessI].end){
            pauseI++;
        }
    }

    pauseI = 0;
    let targetI = 0;
    while(pauseI < pauses.length && targetI < targetRegions.length-1){
        if(pauses[pauseI].start < targetRegions[targetI].end && pauses[pauseI].end > targetRegions[targetI].end){
            pauseMap[pauseI].targetIndex = targetI;
            pauseI++;
            targetI++;
        }
        else if(pauses[pauseI].start > targetRegions[targetI].end){
            targetI++;
        }
        else if(pauses[pauseI].end < targetRegions[targetI].end){
            pauseI++;
        }
    }

    return pauseMap.reduce((counter, nextVal)=>{return nextVal.guessIndex !== undefined && nextVal.targetIndex !== undefined ? counter+1 : counter}, 0);
}