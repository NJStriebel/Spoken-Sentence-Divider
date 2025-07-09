import { runAndDisplay } from "../utils/ProcessExample";
import { textLength } from "../decoders/DecodeWithTextLength";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import type { decodingAlgorithm } from "../utils/ProcessExample";
import { makePauseFinder } from "../utils/FindPauses";
import { makePausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";
import { getProblemFromPangloss } from "../utils/UnpackPangloss";

const FILE_NAME = "crdo-LAG-hyena";

const problem = await getProblemFromPangloss(`./data/${FILE_NAME}.xml`);

const MIN_GAP_PRE_DROP = 0.001;
const PAUSE_DURATION_MIN = 0.01;
const MIN_GAP_POST_DROP = 0.3;

const K_MEANS_ITERATIONS=100;
const K = 2;

const DISTANCE_FACTOR = -1;
const DISTANCE_POWER = 2;
const PAUSE_LENGTH_FACTOR = 10;
const PAUSE_LENGTH_POWER = 1;

const pauseFinder:decodingAlgorithm = makePauseFinder(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K);

const algorithms = [
    pauseFinder,
    {name:"test", decode:makePausesAndPauseAwareLength(PAUSE_DURATION_MIN, MIN_GAP_PRE_DROP, MIN_GAP_POST_DROP, K_MEANS_ITERATIONS, K, DISTANCE_FACTOR, DISTANCE_POWER, PAUSE_LENGTH_FACTOR, PAUSE_LENGTH_POWER).decode, findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
    {name:"quietest-max-nearby-adjustment", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d), findPauses:pauseFinder.findPauses!} as decodingAlgorithm,
]

runAndDisplay(problem.targetSegments, problem.audioFileName, algorithms)