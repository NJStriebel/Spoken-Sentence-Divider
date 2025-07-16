import type { pausesResult } from "../utils/EvaluatePauses";
import { makePauseFinder } from "../utils/FindPauses";
import { getProblemsFromHandAlignedBloomPub } from "../utils/GetTargetPausesFromHandAligned";
import { runWithoutDisplay} from "../utils/ProcessExample";
import { getProblemFromBloom} from "../utils/UnpackBloomFormat";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

const bookNames:string[] = [
    "Cuando Dios hiso todo",
    "Golden Rules",
    "05 God Tests Abraham s Love"
];

const panglossFiles = [
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
const FRACTION_OF_SPEECH = 0.95

//min gap refers to the smallest gap that can exist between two pauses without it being joined
const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.05;
const MIN_GAP_POST_DROP = 0.05;

const DISTANCE_FACTOR = -0.05;
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

console.log(problems)

const aggregateResult : pausesResult = {
    pauses: [],
    predictedNumPauses:0,
    actualNumPauses:0,
    numCorrectIdentified:0
};

const pauseFindingAlg = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, FRACTION_OF_SPEECH);
let i = 1;

for(const prob of problems){
    console.log(`running on ${prob.audioFileName} (${i++} of ${problems.length})`)
    const result = await runWithoutDisplay(prob, pauseFindingAlg) as pausesResult;
    console.log(result);
    aggregateResult.predictedNumPauses += result.predictedNumPauses;
    aggregateResult.actualNumPauses += result.actualNumPauses;
    aggregateResult.numCorrectIdentified += result.numCorrectIdentified;
}

console.log(aggregateResult);