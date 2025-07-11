import type { TimedTextSegment } from "./TimedTextSegment";

//floating point equality check
function fpEqual(x1:number, x2:number):boolean{
    const EPSILON = 0.000001;
    return Math.abs(x1-x2) < EPSILON;
}

//return the sum of the squares of the differences between our algorithm's predicted time and the "correct" time for each split between segments.
//if the result and the target have a different number of segments or if any segment's end is not equal to the next segment's beginning, return -1 instead.
//We also return -1 if any corresponding pair of segments from the result and the target have different text attributes.
export function errorsOnSegmentation(segmentationResult:TimedTextSegment[], segmentationTarget:TimedTextSegment[]):number[]{
    if(segmentationResult.length !== segmentationTarget.length){
        return [];
    }
    
    const errors = [];
    //the number of splits we've made is one less than the number of segments. We don't need to check the start of the first segment OR the end of the last segment
    for(let i = 0; i < segmentationResult.length - 1; i++){
        if( !fpEqual(segmentationResult[i].end, segmentationResult[i+1].start) || !fpEqual(segmentationTarget[i].end, segmentationTarget[i+1].start) || segmentationResult[i].text.trim() !== segmentationTarget[i].text.trim()){
            console.error("Attempted to run error checking on non-matching segments:");
            console.log(segmentationResult[i]);
            console.log(segmentationResult[i+1]);
            console.log(segmentationTarget[i]);
            console.log(segmentationTarget[i+1]);
            return [];
        }
        else{
           errors.push( Math.abs(segmentationTarget[i].end - segmentationResult[i].end) );
        }
    }
    return errors;
}

