import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { makePauseFinder } from "../utils/FindPauses";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { getProblemFromBloom, type parsingProblem } from "../utils/UnpackBloomFormat";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

const bookNames = ["Kade Comma", "04 - Cat and Dog and the Hats"];

const panglossFiles = ["crdo-LAG-hyena", "lamo-s-0001"].map(name=>`./data/${name}.xml`)

const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.03;
const MIN_GAP_POST_DROP = 0.5;

const K_MEANS_ITERATIONS=20;
const K = 2;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = 1/4

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

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