import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { makeQuietestNearbyByInterval } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { makePauseFinder } from "../utils/FindPauses";
import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";
import type { parsingProblem } from "../utils/UnpackBloomFormat";

console.debug("running iterative tests...");

const bookNames:string[] = [
    "Cuando Dios hiso todo",
    "Golden Rules",
    "05 God Tests Abraham s Love",
    "Bell in cat s neck",
    "Shaka and mazi",
    "A donkey speaks to Balaam",
    "Bangladesh"
];

const K_MEANS_ITERATIONS=10;
const K = 3;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = .5

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.0005;
const PAUSE_DURATION_MIN = 0.1;
const MIN_GAP_POST_DROP = 0.001;

const problems = [];

for(const bookPath of bookNames){
    const thisBookProbs = await getProblemsFromHandAlignedBloomPub(bookPath);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}
console.debug("problems successfully gathered")

type agResult = {
    adjustedMSEs:number[],
    correct: number,
    outOf: number
}

type pageResult = {
    result:decodeResult,
    baseline:decodeResult
}

const pauseFinder = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH).findPauses!;

for(let DISTANCE_FACTOR = -0.01; DISTANCE_FACTOR > -10; DISTANCE_FACTOR *= 2){
for(let DISTANCE_POWER = 2; DISTANCE_POWER < 2.1; DISTANCE_POWER += 0.5){
for(let PAUSE_LENGTH_POWER = 1; PAUSE_LENGTH_POWER < 2; PAUSE_LENGTH_POWER +=1){
console.debug("iteration one")

const aggregateResult :agResult = {
    adjustedMSEs: [],
    correct: 0,
    outOf:0
};

const algorithm :decodingAlgorithm = {
    name:"test-alg",
    decode: makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_POWER).decode,
    findPauses: pauseFinder
}

async function onePage(prob: parsingProblem, on:number, of:number):Promise<pageResult>{
    console.debug(`Start processing ${on}/${of}`)
    const result = await runWithoutDisplay(prob, algorithm) as decodeResult;
    console.debug(`ran main algorithm on problem ${on}/${of} - scored ${result.correct}/${result.outOf}`);

    return {result:result} as pageResult;
}

const results: Promise<pageResult>[] = [];

let i = 1;
for(const prob of problems){
    results.push(onePage(prob, i++, problems.length));
}

let perfectPages = 0;

i = 1;
for(const output of results){
    console.debug(`Awaiting output from page ${i++}/${results.length}`);

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    aggregateResult.adjustedMSEs.push(thisPage.result.mse! * thisPage.result.outOf!);
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;
}

const resultMSE = aggregateResult.adjustedMSEs.reduce((total,current)=>total+current) / aggregateResult.outOf;

console.log(`algorithm under test:\n${DISTANCE_FACTOR},${DISTANCE_POWER},${PAUSE_LENGTH_POWER}\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\nmse: ${resultMSE}\npages: ${perfectPages}/${i}`);
}}}