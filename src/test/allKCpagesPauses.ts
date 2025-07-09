import { makePauseFinder } from "../utils/FindPauses";
import type { pausesResult } from "../utils/EvaluatePauses";
import { runWithoutDisplay } from "../utils/ProcessExample";
import { getProblemFromFiles } from "../utils/UnpackBloomFormat";

const htmFiles = ["./data/Kãde cɔ̃mmã.htm"];

const problems = [];
for(const htmFile of htmFiles){
    const nextProbs = await getProblemFromFiles(htmFile);
    for(const prob of nextProbs){
        prob.audioFileName = "./data/Kãde_cɔ̃mmã-audio/" + prob.audioFileName
        problems.push(prob);
    }
}

const aggregateResult : pausesResult = {
    pauses:[],
    predictedNumPauses:0,
    actualNumPauses:0,
    numCorrectIdentified:0
};

const pauseFindingAlg = makePauseFinder(0.001, 0.5, 5);
let i = 1;

for(const prob of problems){
    console.log(`running on page ${i++} of ${problems.length}`)
    const result = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, pauseFindingAlg) as pausesResult;
    console.log(result);
    aggregateResult.predictedNumPauses += result.predictedNumPauses;
    aggregateResult.actualNumPauses += result.actualNumPauses;
    aggregateResult.numCorrectIdentified += result.numCorrectIdentified;
}

console.log(aggregateResult);