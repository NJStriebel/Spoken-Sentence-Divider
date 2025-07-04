import type {TimedTextSegment} from "./TimedTextSegment"
import {errorsOnSegmentation} from "./ErrorCalc"
import {makeWaveSurfer} from "./makeWaveSurfer"

export type decodingAlgorithm = {
    name:string,
    decode?:(initialSegments: TimedTextSegment[], audioData: number[], duration: number)=>TimedTextSegment[],
    findPauses?:(audioData:number[], duration:number)=>TimedTextSegment[]
}

type runResult = {
    segs:TimedTextSegment[],
    mse:number,
    worstError:number
}

export async function runAndDisplay(targetSegs:TimedTextSegment[], audiofile:string, algorithms:decodingAlgorithm[]){
    const ws = await makeWaveSurfer("main-wavesurfer", audiofile, targetSegs, false);

    const sents = document.getElementById("sentences")!;
    sents.innerText = targetSegs.reduce((msg, thisSeg, thisIndex)=>{
        if(thisIndex > 0) return msg + "\n" + thisSeg.text;
        else return msg + thisSeg.text;
    }, "")

    const audio = Array.from( ws.getDecodedData()?.getChannelData(0)! );

    const duration = ws.getDuration();

    for(const alg of algorithms){
        const result = runOneAlgorithm(targetSegs, audio, duration, alg);
        displayOneResult(alg, audiofile, result);
    }
}

function runOneAlgorithm(targetSegs:TimedTextSegment[], audioData:number[], duration:number, alg:decodingAlgorithm) : runResult{
    const segs = targetSegs.map((seg) => {return{start:0,end:0,text:seg.text}});

    let pauseFinder = (typeof alg.findPauses !== "undefined");
    let decoder = (typeof alg.decode !== "undefined");

    let resultSegs:TimedTextSegment[] = [];
    if(decoder){
        resultSegs = alg.decode!(segs, audioData, duration);
    }
    if(pauseFinder){
        resultSegs = alg.findPauses!(audioData, duration);
    }

    if(decoder){
        const errors = errorsOnSegmentation(resultSegs, targetSegs);
        const meanSquaredError = errors.reduce((acc, next) => next**2+acc) / errors.length;
        const worstError = Math.max(...errors);
        return {segs:resultSegs, mse:meanSquaredError, worstError:worstError}
    }

    return {segs:resultSegs, mse:0, worstError:0}    
}

function displayOneResult(algorithm:decodingAlgorithm, soundfile:string, result:runResult){
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

    if(typeof algorithm.decode !== "undefined"){
        const meanErrorDisplay = document.createElement("p");
        meanErrorDisplay.innerText = `Mean squared error: ${result.mse}`;
        meanErrorDisplay.id = `${algorithm.name}-mean-error`
        container.appendChild(meanErrorDisplay);

        const worstErrorDisplay = document.createElement("p");
        worstErrorDisplay.innerText = `Greatest error: ${result.worstError}`;
        worstErrorDisplay.id = `${algorithm.name}-worst-error`
        container.appendChild(worstErrorDisplay);
    }

    makeWaveSurfer(wsDisplay.id, soundfile, result.segs, typeof algorithm.findPauses !== "undefined");

    container.appendChild(document.createElement("hr"));
}