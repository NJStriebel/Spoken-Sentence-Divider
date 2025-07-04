import { getIsSpeech, pauseIntervals } from "../FindPauses";
import type { TimedTextSegment } from "../utils/TimedTextSegment";

//place the initial breaks by making the less-naive assumption that number of characters in a segment is proportional to its length WITHOUT PAUSES
export function pauseAwareTextLength(initialSegments: TimedTextSegment[], audioData: number[], duration: number){
    const pauseSegs: TimedTextSegment[] = pauseIntervals(audioData, duration);

    const isSpeech: boolean[] = getIsSpeech(audioData);
    const sampleDuration = duration / audioData.length; //seconds per segment
    let speechSamples = 0;

    for(const sample of isSpeech){
        if(sample) speechSamples++;
    }
   
    const totalTextLength :number = initialSegments.reduce((lengthSoFar:number, thisSegment:TimedTextSegment) => {return lengthSoFar + thisSegment.text.length}, 0);

    let initialSegsI = 0;
    let currentSeg = initialSegments[initialSegsI++];
    let speechSamplesInSeg = speechSamples * currentSeg.text.length / totalTextLength;
    let speechSamplesInSegSoFar = 0;
    const segments:TimedTextSegment[] = [];

    for(let i = 0; i < isSpeech.length; i++){
        if(isSpeech[i]){
            speechSamplesInSegSoFar++;
        }

        if(speechSamplesInSegSoFar >= speechSamplesInSeg){
            currentSeg.end = i * sampleDuration;
            segments.push(currentSeg);

            currentSeg = initialSegments[initialSegsI++];
            currentSeg.start = i * sampleDuration;
            speechSamplesInSeg = speechSamples * currentSeg.text.length / totalTextLength;
            speechSamplesInSegSoFar = 0;
        }

        if(initialSegsI >= initialSegments.length){
            currentSeg.end = duration;
            segments.push(currentSeg);
            break;
        }
    }

    return segments;
}