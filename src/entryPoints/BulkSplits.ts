import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { makeQuietestNearbyByInterval } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { makePauseFinder } from "../utils/FindPauses";
import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";
import type { parsingProblem } from "../utils/UnpackBloomFormat";

console.log("running bulk splits...");

const bookNames:string[] = [
    "Cuando Dios hiso todo",
    "Golden Rules",
    "05 God Tests Abraham s Love",
    "Bell in cat s neck",
    "Shaka and mazi",
    "A donkey speaks to Balaam",
    "Bangladesh"
];

const panglossFiles:string[] = [
    /*"conte_01_l_heritier", 
    "crdo-CKB_WOMEN", 
    "crdo-LAG-hyena", 
    "crdo-NBC_MERMAID",
    "crdo-NGE_FOURMI", 
    "crdo-SVM_LIEVRE",
    "crdo-WLS_UVEAC1FB_1",
    "IKE_KAUTJAJUK_STORY",
    "ike_lizzie_niviaxie",
    "lamo-s-0001"*/
].map(name=>`./data/TrainingSet1/${name}.xml`)

const K_MEANS_ITERATIONS=10;
const K = 3;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 0.75

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.0001;
const PAUSE_DURATION_MIN = 0.3;
const MIN_GAP_POST_DROP = 0.05;

const DISTANCE_FACTOR = -0.05;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_POWER = 1;

// parameters for making a version of John's original algorithm
const BASELINE_INTERVAL = 0.16;
const BASELINE_SLOP_PERCENT = .4;

const problems = [];

for(const bookPath of bookNames){
    const thisBookProbs = await getProblemsFromHandAlignedBloomPub(bookPath);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}

console.log(problems)

for(const pfPath of panglossFiles){
    problems.push(await getProblemFromPangloss(pfPath));
}

type agResult = {
    adjustedMSEs:number[],
    correct: number,
    outOf: number
}

const aggregateResult :agResult = {
    adjustedMSEs: [],
    correct: 0,
    outOf:0
};

const aggregateBaseline : agResult = {
    adjustedMSEs: [],
    correct: 0,
    outOf:0,
};

const pauseFinder = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH).findPauses!;

const algorithm :decodingAlgorithm = {
    name:"test-alg",
    decode: makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_POWER).decode,
    findPauses: pauseFinder
}

const baseLineAlg : decodingAlgorithm = {
    name:"baseline",
    decode: (is, ad, d) => makeQuietestNearbyByInterval(BASELINE_INTERVAL, BASELINE_SLOP_PERCENT)(textLength(is, ad, d), ad, d),
    findPauses: pauseFinder
}

type pageResult = {
    result:decodeResult,
    baseline:decodeResult
}

async function onePage(prob: parsingProblem, on:number, of:number):Promise<pageResult>{
    console.log(`Start processing ${on}/${of}`)
    const result = await runWithoutDisplay(prob, algorithm) as decodeResult;
    console.log(`ran main algorithm on problem ${on}/${of} - scored ${result.correct}/${result.outOf}`);
    // const baseline = await runWithoutDisplay(prob, baseLineAlg) as decodeResult;
    // console.log(`ran baseline on problem ${on}/${of} - scored ${baseline.correct}/${baseline.outOf}`);

    return {result:result, /*baseline:baseline*/} as pageResult;
}

const results: Promise<pageResult>[] = [];

let i = 1;
for(const prob of problems){
    results.push(onePage(prob, i++, problems.length));
}

let perfectPages = 0;
// let baselinePerfectPages = 0;

i = 1;
for(const output of results){
    console.log(`Awaiting output from page ${i++}/${results.length}`);

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    aggregateResult.adjustedMSEs.push(thisPage.result.mse! * thisPage.result.outOf!);
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;

    // aggregateBaseline.correct! += thisPage.baseline.correct!;
    // aggregateBaseline.outOf! += thisPage.baseline.outOf!;
    // aggregateBaseline.adjustedMSEs.push(thisPage.baseline.mse! * thisPage.baseline.outOf!);
    // if(thisPage.baseline.correct! == thisPage.baseline.outOf!) baselinePerfectPages++;
}

const resultMSE = aggregateResult.adjustedMSEs.reduce((total,current)=>total+current) / aggregateResult.outOf;
// const baselineMSE = aggregateBaseline.adjustedMSEs.reduce((total,current)=>total+current) / aggregateBaseline.outOf;

console.log(`algorithm under test:\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\nmse: ${resultMSE}\npages: ${perfectPages}/${i}`);
// console.log(`baseline:\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\nmse: ${baselineMSE}\npages: ${baselinePerfectPages}/${i}`);