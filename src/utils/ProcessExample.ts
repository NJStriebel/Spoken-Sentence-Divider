import type {TimedTextSegment} from "./TimedTextSegment"
import type { pausesResult } from "./EvaluatePauses"
import {makeWaveSurfer} from "./makeWaveSurfer"
import { evaluatePauses } from "./EvaluatePauses"
import { evaluateSplits, evaluateSplitsGivenHandmadePauses } from "./EvaluateSplits"
import { errorsOnSegmentation } from "./ErrorCalc"
import type { parsingProblem } from "./UnpackBloomFormat"

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

export async function runWithoutDisplay(prob:parsingProblem, algorithm:decodingAlgorithm):Promise<pausesResult|decodeResult>{
    const ws = await makeWaveSurfer("main-wavesurfer", prob.audioFileName, prob.targetSegments , []);

    const audio = Array.from( ws.getDecodedData()?.getChannelData(0)! );

    const duration = ws.getDuration();

    return runOneAlgorithm(prob, audio, duration, algorithm);
}


export async function runAndDisplay(prob: parsingProblem, algorithms:decodingAlgorithm[]){
    const ws = await makeWaveSurfer("main-wavesurfer", prob.audioFileName, prob.targetSegments, prob.targetPauses);

    const sents = document.getElementById("sentences")!;
    sents.innerText = prob.targetSegments.reduce((msg, thisSeg, thisIndex)=>{
        if(thisIndex === 0) return msg + thisSeg.text;
        else if(thisIndex < 5) return msg + "\n" + thisSeg.text;
        else if(thisIndex === 5) return msg + "\n" + thisSeg.text + "\n";
        else return msg + "."
    }, "")

    const audio = Array.from( ws.getDecodedData()?.getChannelData(0)! );

    const duration = ws.getDuration();

    for(const alg of algorithms){
        const result = runOneAlgorithm(prob, audio, duration, alg);
        displayOneResult(alg, prob.audioFileName, result);
    }
}

function runOneAlgorithm(prob:parsingProblem, audioData:number[], duration:number, alg:decodingAlgorithm) : decodeResult|pausesResult{  
    const segs = prob.targetSegments.map((seg) => {return{start:0,end:0,text:seg.text}});
    let pauseFinder = (typeof alg.findPauses !== "undefined");
    let decoder = (typeof alg.decode !== "undefined");

    let resultSegs:TimedTextSegment[] = [];

    if(prob.targetPauses != undefined && decoder){
        const resultSegs = alg.decode!(segs, audioData, duration);

        return{
            segs: resultSegs,
            correct: evaluateSplitsGivenHandmadePauses(resultSegs, prob.targetPauses),
            outOf: segs.length-1,
            mse: evaluateSplits(resultSegs, prob.targetSegments)
        };
    }
    else if(decoder && pauseFinder){
        resultSegs = alg.decode!(segs, audioData, duration);
        const pauses = alg.findPauses!(audioData, duration);
        const correctSplits = evaluateSplits(resultSegs, prob.targetSegments, pauses);
        const numTotalSplits = segs.length-1;
        const error = evaluateSplits(resultSegs, prob.targetSegments);
        return {segs:resultSegs, correct:correctSplits, outOf:numTotalSplits, mse:error} as decodeResult;
    }
    else if(pauseFinder){
        resultSegs = alg.findPauses!(audioData, duration);
        return evaluatePauses(resultSegs, prob.targetSegments) as pausesResult;
    }
    else if(decoder){
        resultSegs = alg.decode!(segs, audioData, duration);
        return {segs:resultSegs, mse:evaluateSplits(resultSegs, prob.targetSegments)} as decodeResult;
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

        makeWaveSurfer(wsDisplay.id, soundfile, dResult.segs, []);
    }
    else if(typeof algorithm.decode !== "undefined"){
        const dResult = result as decodeResult;
        const meanErrorDisplay = document.createElement("p");
        meanErrorDisplay.innerText = `Mean squared error: ${dResult.mse}`;
        meanErrorDisplay.id = `${algorithm.name}-mean-error`
        container.appendChild(meanErrorDisplay);

        makeWaveSurfer(wsDisplay.id, soundfile, dResult.segs, []);
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

        makeWaveSurfer(wsDisplay.id, soundfile, [], pResult.pauses);
    }

    container.appendChild(document.createElement("hr"));
}