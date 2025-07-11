import type {TimedTextSegment} from "./TimedTextSegment"
import type { pausesResult } from "./EvaluatePauses"
import {makeWaveSurfer} from "./makeWaveSurfer"
import { evaluatePauses } from "./EvaluatePauses"
import { evaluateSplits } from "./EvaluateSplits"
import { errorsOnSegmentation } from "./ErrorCalc"

export type decodingAlgorithm = {
    name:string,
    decode?:(initialSegments: TimedTextSegment[], audioData: number[], duration: number)=>TimedTextSegment[],
    findPauses?:(audioData:number[], duration:number)=>TimedTextSegment[]
}

export type decodeResult = {
    segs:TimedTextSegment[],
    mse?:number,
    correct?:number,
    outOf?:number
}

export async function runWithoutDisplay(targetSegs:TimedTextSegment[], audiofile:string, algorithm:decodingAlgorithm):Promise<pausesResult|decodeResult>{
    const ws = await makeWaveSurfer("main-wavesurfer", audiofile, targetSegs, false);

    const audio = Array.from( ws.getDecodedData()?.getChannelData(0)! );

    const duration = ws.getDuration();

    return runOneAlgorithm(targetSegs, audio, duration, algorithm);
}


export async function runAndDisplay(targetSegs:TimedTextSegment[], audiofile:string, algorithms:decodingAlgorithm[]){
    const ws = await makeWaveSurfer("main-wavesurfer", audiofile, targetSegs, false);

    const sents = document.getElementById("sentences")!;
    sents.innerText = targetSegs.reduce((msg, thisSeg, thisIndex)=>{
        if(thisIndex === 0) return msg + thisSeg.text;
        else if(thisIndex < 5) return msg + "\n" + thisSeg.text;
        else if(thisIndex === 5) return msg + "\n" + thisSeg.text + "\n"
        else return msg + "."
    }, "")

    const audio = Array.from( ws.getDecodedData()?.getChannelData(0)! );

    const duration = ws.getDuration();

    for(const alg of algorithms){
        const result = runOneAlgorithm(targetSegs, audio, duration, alg);
        displayOneResult(alg, audiofile, result);
    }
}

function runOneAlgorithm(targetSegs:TimedTextSegment[], audioData:number[], duration:number, alg:decodingAlgorithm) : decodeResult|pausesResult{
    const segs = targetSegs.map((seg) => {return{start:0,end:0,text:seg.text}});

    let pauseFinder = (typeof alg.findPauses !== "undefined");
    let decoder = (typeof alg.decode !== "undefined");

    let resultSegs:TimedTextSegment[] = [];
    if(decoder){
        
    }
    if(pauseFinder){
        
    }

    if(decoder && pauseFinder){
        const pauses = alg.findPauses!(audioData, duration);
        resultSegs = alg.decode!(segs, audioData, duration);
        const correctSplits = evaluateSplits(resultSegs, targetSegs, pauses);
        const numTotalSplits = segs.length-1;
        const error = evaluateSplits(resultSegs, targetSegs);
        return {segs:resultSegs, correct:correctSplits, outOf:numTotalSplits, mse:error} as decodeResult;
    }
    else if(pauseFinder){
        resultSegs = alg.findPauses!(audioData, duration);
        return evaluatePauses(resultSegs, targetSegs) as pausesResult;
    }
    else if(decoder){
        resultSegs = alg.decode!(segs, audioData, duration);
        return {segs:resultSegs, mse:evaluateSplits(resultSegs, targetSegs)} as decodeResult;
    }
    return {segs:resultSegs};
}

function displayOneResult(algorithm:decodingAlgorithm, soundfile:string, result:decodeResult|pausesResult){
    const container = document.createElement("div");
    container.classList.add("sub-container");
    container.id = `${algorithm.name}-container`

    const parentContainer = document.getElementById("second-container");
    parentContainer?.appendChild(container);

    const nameDisplay = document.createElement("h3");
    nameDisplay.innerText = algorithm.name;
    nameDisplay.id = `${algorithm.name}-text`
    container.appendChild(nameDisplay);

    const wsDisplay = document.createElement("div");
    wsDisplay.id = `${algorithm.name}-wavesurfer`
    container.appendChild(wsDisplay);

    if(typeof algorithm.decode !== "undefined" && typeof algorithm.findPauses !== "undefined"){
        const dResult = result as decodeResult;

        const accuracyDisplay = document.createElement("p");
        accuracyDisplay.innerText = `Accuracy: ${dResult.correct}/${dResult.outOf} correct`;
        accuracyDisplay.id = `${algorithm.name}-accuracy-display`;
        container.appendChild(accuracyDisplay);

        const meanErrorDisplay = document.createElement("p");
        meanErrorDisplay.innerText = `Mean squared error: ${dResult.mse}`;
        meanErrorDisplay.id = `${algorithm.name}-mean-error`
        container.appendChild(meanErrorDisplay);

        makeWaveSurfer(wsDisplay.id, soundfile, dResult.segs, false);
    }
    else if(typeof algorithm.decode !== "undefined"){
        const dResult = result as decodeResult;
        const meanErrorDisplay = document.createElement("p");
        meanErrorDisplay.innerText = `Mean squared error: ${dResult.mse}`;
        meanErrorDisplay.id = `${algorithm.name}-mean-error`
        container.appendChild(meanErrorDisplay);

        makeWaveSurfer(wsDisplay.id, soundfile, dResult.segs, false);
    }
    else{
        const pResult = result as pausesResult;

        const numCorrectDisplay = document.createElement("p");
        numCorrectDisplay.innerText = `Accuracy:\tCorrectly identified ${pResult.numCorrectIdentified}/${pResult.actualNumPauses}`;
        numCorrectDisplay.id = `${algorithm.name}-correct-pauses`;
        container.appendChild(numCorrectDisplay);
                
        const numPredictedDisplay = document.createElement("p");
        numPredictedDisplay.innerText = `Precision:\tFound ${pResult.predictedNumPauses} pauses`;
        numPredictedDisplay.id = `${algorithm.name}-pausesFound`;
        container.appendChild(numPredictedDisplay);

        makeWaveSurfer(wsDisplay.id, soundfile, pResult.pauses, true);
    }

    container.appendChild(document.createElement("hr"));
}