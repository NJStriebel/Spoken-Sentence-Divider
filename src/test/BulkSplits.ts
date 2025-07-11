import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { errorsOnSegmentation } from "../utils/ErrorCalc";
import { makePauseFinder } from "../utils/FindPauses";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromBloom, type parsingProblem } from "../utils/UnpackBloomFormat";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

console.log("running...");

const bookNames:string[] = []//"Kade Comma", "04 - Cat and Dog and the Hats"];

const panglossFiles:string[] = [
    "conte_01_l_heritier", 
    "crdo-CKB_WOMEN", 
    "crdo-LAG-hyena", 
    "crdo-NBC_MERMAID",
    "crdo-NGE_FOURMI", 
    "crdo-SVM_LIEVRE",
    "crdo-WLS_UVEAC1FB_1",
    "IKE_KAUTJAJUK_STORY",
    "ike_lizzie_niviaxie",
    "lamo-s-0001"
].map(name=>`./data/TrainingSet1/${name}.xml`)

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
const PAUSE_LENGTH_POWER = 2;

const problems = [];

for(const bookName of bookNames){
    const thisBookProbs = await getProblemFromBloom(`./data/${bookName}.htm`);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}

for(const pfPath of panglossFiles){
    problems.push(await getProblemFromPangloss(pfPath));
}

console.log(problems)

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

async function onePage(prob: parsingProblem, on:number, of:number):Promise<pageResult>{
    console.log(`Start processing ${on}/${of}`)
    const result = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, algorithm) as decodeResult;
    console.log(`ran main algorithm on ${on}/${of}`);
    //const baseline = await runWithoutDisplay(prob.targetSegments, prob.audioFileName, baseLineAlg) as decodeResult;
    //console.log(`ran baseline on ${on}/${of}`)

    return {result:result, baseline:{correct:0, mse:0, outOf:0, segs:[]}/*baseline*/} as pageResult;
}

const results: Promise<pageResult>[] = [];

let i = 1;
for(const prob of problems){
    results.push(onePage(prob, i++, problems.length));
}

let perfectPages = 0;
let baselinePerfectPages = 0;

i = 1;
for(const output of results){
    console.log(`Awaiting output from page ${i++}/${results.length}`)

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    aggregateResult.adjustedMSEs.push(thisPage.result.mse! * thisPage.result.outOf!);
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;

    aggregateBaseline.correct! += thisPage.baseline.correct!;
    aggregateBaseline.outOf! += thisPage.baseline.outOf!;
    aggregateBaseline.adjustedMSEs.push(thisPage.baseline.mse! * thisPage.baseline.outOf!);
    if(thisPage.baseline.correct! == thisPage.baseline.outOf!) baselinePerfectPages++;
}

const resultMSE = aggregateResult.adjustedMSEs.reduce((total,current)=>total+current) / aggregateResult.outOf;
const baselineMSE = aggregateBaseline.adjustedMSEs.reduce((total,current)=>total+current) / aggregateBaseline.outOf;

console.log(`algorithm under test:\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\nmse: ${resultMSE}\npages: ${perfectPages}/${i}`);
console.log(`baseline:\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\nmse: ${baselineMSE}\npages: ${baselinePerfectPages}/${i}`);