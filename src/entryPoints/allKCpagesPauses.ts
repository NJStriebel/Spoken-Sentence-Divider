import { makePauseFinder } from "../utils/FindPauses";
import type { pausesResult } from "../utils/EvaluatePauses";
import { runWithoutDisplay } from "../utils/ProcessExample";
import { getProblemFromBloom } from "../utils/UnpackBloomFormat";

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.1;
const MIN_GAP_POST_DROP = 0.15;

const K_MEANS_ITERATIONS=10;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 3/4

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

const htmFiles = ["./data/Kade Comma.htm"];

const problems = [];
for(const htmFile of htmFiles){
    const nextProbs = await getProblemFromBloom(htmFile);
    for(const prob of nextProbs){
        problems.push(prob);
    }
}

const aggregateResult : pausesResult = {
    pauses:[],
    predictedNumPauses:0,
    actualNumPauses:0,
    numCorrectIdentified:0
};

const pauseFindingAlg = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH);
let i = 1;

for(const prob of problems){
    console.log(`running on page ${i++} of ${problems.length}`)
    const result = await runWithoutDisplay(prob, pauseFindingAlg) as pausesResult;
    console.log(result);
    aggregateResult.predictedNumPauses += result.predictedNumPauses;
    aggregateResult.actualNumPauses += result.actualNumPauses;
    aggregateResult.numCorrectIdentified += result.numCorrectIdentified;
}

console.log(aggregateResult);