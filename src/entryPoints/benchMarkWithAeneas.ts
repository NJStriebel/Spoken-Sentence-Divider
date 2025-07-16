import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import { evaluateSplits } from "../utils/EvaluateSplits";
import { makePauseFinder } from "../utils/FindPauses";
import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { runWithoutDisplay, type decodeResult, type decodingAlgorithm } from "../utils/ProcessExample";
import { ttsFromAeneasOutput } from "../utils/UnpackAeneasOutput";
import { getProblemFromBloom, type parsingProblem } from "../utils/UnpackBloomFormat";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

console.log("running...");

const bookNames:string[] = [
    "05 God Tests Abraham s Love",
    "Cuando Dios hiso todo",
    "Golden Rules"
]

const panglossFiles:string[] = [
    /*"conte_01_l_heritier", 
    "crdo-CKB_WOMEN", 
    "crdo-LAG-hyena", 
    "crdo-NBC_MERMAID",
    //"crdo-NGE_FOURMI", //for whatever reason, aeneas can't handle this example
    "crdo-SVM_LIEVRE",
    "crdo-WLS_UVEAC1FB_1",
    "IKE_KAUTJAJUK_STORY",
    "ike_lizzie_niviaxie",
    "lamo-s-0001"*/
].map(name=>`./data/TrainingSet1/${name}.xml`)

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.05;
const MIN_GAP_POST_DROP = 0.05;

const K_MEANS_ITERATIONS=10;
const K = 3;

//determines where the threshold is placed. 1/4 means 25% of the way from the background noise centroid to the speech centroid.
const FRACTION_OF_SPEECH = .25

const DISTANCE_FACTOR = -0.025;
const PAUSE_LENGTH_FACTOR = 1; //only matters relative to distance factor. Remove in final form.
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_POWER = .1;

const problems = [];

for(const bookName of bookNames){
    const thisBookProbs = await getProblemsFromHandAlignedBloomPub(bookName);
    for(const prob of thisBookProbs){
        problems.push(prob);
    }
}

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

const aggregateAeneas : agResult = {
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
    baseline:decodeResult,
    aeneas:decodeResult
}

async function onePage(prob: parsingProblem, aeneasFile:string, on:number, of:number):Promise<pageResult>{
    console.debug(`Start processing ${on}/${of}`)
    const result = await runWithoutDisplay(prob, algorithm) as decodeResult;
    console.debug(`ran main algorithm on ${on}/${of}`);

    const baseline = await runWithoutDisplay(prob, baseLineAlg) as decodeResult;
    console.debug(`ran baseline on ${on}/${of}`)

    const aeneasSegs = await ttsFromAeneasOutput(aeneasFile); 

    const aeneasAlgorithm = {
        name:"aeneas",
        decode:(is, ad, d)=>aeneasSegs,
        findPauses:pauseFinder
    }as decodingAlgorithm
    const aeneasResult = await runWithoutDisplay(prob, aeneasAlgorithm) as decodeResult;
    console.debug(`ran aeneas on ${on}/${of}`)

    return {result:result, aeneas:aeneasResult, baseline:baseline};
}

const results: Promise<pageResult>[] = [];

let i = 1;
let pageI = 0;
let lastBookName = problems[0].audioFileName.match(/HandAligned[/](.*)-Beginning/)![1];
for(const prob of problems){
    const thisBookName = prob.audioFileName.match(/HandAligned[/](.*)-Beginning/)![1];
    if(thisBookName != lastBookName){
        pageI = 0;
        lastBookName = thisBookName;
    }
    const aeneasFile = `./aeneasOutput/${thisBookName}_pg${pageI++}-aeneasOutput.txt`    
    results.push(onePage(prob, aeneasFile, i++, problems.length));
}

let perfectPages = 0;
let baselinePerfectPages = 0;
let aeneasPerfectPages = 0;

i = 1;
for(const output of results){
    console.debug(`Awaiting output from page ${i++}/${results.length}`)

    const thisPage = await output;

    aggregateResult.correct! += thisPage.result.correct!;
    aggregateResult.outOf! += thisPage.result.outOf!;
    aggregateResult.adjustedMSEs.push(thisPage.result.mse! * thisPage.result.outOf!);
    if(thisPage.result.correct! === thisPage.result.outOf!) perfectPages++;

    aggregateBaseline.correct! += thisPage.baseline.correct!;
    aggregateBaseline.outOf! += thisPage.baseline.outOf!;
    aggregateBaseline.adjustedMSEs.push(thisPage.baseline.mse! * thisPage.baseline.outOf!);
    if(thisPage.baseline.correct! == thisPage.baseline.outOf!) baselinePerfectPages++;

    aggregateAeneas.correct! += thisPage.aeneas.correct!;
    aggregateAeneas.outOf! += thisPage.aeneas.outOf!;
    aggregateAeneas.adjustedMSEs.push(thisPage.aeneas.mse! * thisPage.aeneas.outOf!);
    if(thisPage.aeneas.correct! == thisPage.aeneas.outOf!) aeneasPerfectPages++;
}

const resultMSE = aggregateResult.adjustedMSEs.reduce((total,current)=>total+current) / aggregateResult.outOf;
const baselineMSE = aggregateBaseline.adjustedMSEs.reduce((total,current)=>total+current) / aggregateBaseline.outOf;
const aeneasMSE = aggregateAeneas.adjustedMSEs.reduce((total,current)=>total+current) / aggregateAeneas.outOf;

console.log(`algorithm under test:\nphrases: ${aggregateResult.correct}/${aggregateResult.outOf}\nmse: ${resultMSE}\npages: ${perfectPages}/${i}`);
console.log(`baseline:\nphrases: ${aggregateBaseline.correct}/${aggregateBaseline.outOf}\nmse: ${baselineMSE}\npages: ${baselinePerfectPages}/${i}`);
console.log(`aeneas:\nphrases: ${aggregateAeneas.correct}/${aggregateAeneas.outOf}\nmse: ${aeneasMSE}\npages: ${aeneasPerfectPages}/${i}`);