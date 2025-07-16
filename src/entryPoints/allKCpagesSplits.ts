import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { makePauseFinder } from "../utils/FindPauses";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromBloom, type parsingProblem } from "../utils/UnpackBloomFormat";

const htmFiles = ["./data/Kade Comma.htm"];

const problems = [];
for(const htmFile of htmFiles){
    const nextProbs = await getProblemFromBloom(htmFile);
    for(const prob of nextProbs){
        problems.push(prob);
    }
}

const aggregateResult : decodeResult = {
    segs:[],
    correct: 0,
    outOf:0,
};

const aggregateBaseline : decodeResult = {
    segs:[],
    correct: 0,
    outOf:0,
};

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.1;
const MIN_GAP_POST_DROP = 0.15;

const K_MEANS_ITERATIONS=10;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 3/4

const DISTANCE_FACTOR = -0.025;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 1; //only matters relative to distance factor. Remove in final form.
const PAUSE_LENGTH_POWER = 0.5;

const pauseFinder = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH).findPauses!;

const algorithm :decodingAlgorithm = {
    name:"test-alg",
    decode: makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_FACTOR, PAUSE_LENGTH_POWER).decode,
    findPauses: pauseFinder
}

const baseLineAlg : decodingAlgorithm = {
    name:"baseline",
    decode: (is, ad, d) => quietestNearby(textLength(is, ad, d), ad, d),
    findPauses: pauseFinder
}

type pageResult = {
    result:decodeResult,
    baseline:decodeResult
}

async function onePage(prob: parsingProblem):Promise<pageResult>{
    const result = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, algorithm) as decodeResult;
    const baseline = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, baseLineAlg) as decodeResult;

    return {result:result, baseline:baseline} as pageResult;
}

const results: Promise<pageResult>[] = [];

for(const prob of problems){
    results.push(onePage(prob));
}

let perfectPages = 0;
let baselinePerfectPages = 0;

let i = 1;
for(const output of results){
    console.log(`Processing page ${i++}/${results.length}`)

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;

    aggregateBaseline.correct! += thisPage.baseline.correct!;
    aggregateBaseline.outOf! += thisPage.result.outOf!;
    if(thisPage.baseline.correct! == thisPage.baseline.outOf!) baselinePerfectPages++;
}

console.log(`algorithm under test:\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\npages: ${perfectPages}/${i}`);
console.log(`baseline:\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\npages: ${baselinePerfectPages}/${i}`);