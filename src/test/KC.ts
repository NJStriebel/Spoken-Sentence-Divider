import { runAndDisplay } from "../utils/ProcessExample";
import { getProblemFromFiles } from "../utils/UnpackBloomFormat";
//import { equalLength } from "../decoders/DecodeWithEqualLength";
import { textLength } from "../decoders/DecodeWithTextLength";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";

import type { decodingAlgorithm } from "../utils/ProcessExample";
import { pauseIntervals } from "../FindPauses";
import { pausesAndTextLength } from "../decoders/DecodeWithPausesAndLength";
import { pauseAwareTextLength } from "../decoders/PauseAwareTextLength";
import { pausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength";

const KCproblems = await getProblemFromFiles("./data/Kãde cɔ̃mmã.htm");

const audfile = `data/Kãde_cɔ̃mmã-audio/${KCproblems[2].audioFileName}`;

const algorithms = [
    /*{name:"equal-length", decode: equalLength},
    {name:"quietest-nearby-equal-length", decode: (is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(equalLength(is, ad, d), ad, d)},*/
    {name:"highlight-pauses", findPauses:pauseIntervals} as decodingAlgorithm,
    {name:"pauses-and-pause-aware-text-length",decode:pausesAndPauseAwareLength},
    //{name:"pause-aware-text-length",decode:pauseAwareTextLength},
    //{name:"text-length",decode:textLength},
    //{name:"pauses-and-text-length", decode:pausesAndTextLength} as decodingAlgorithm,
    {name:"quietest-max-nearby-adjustment", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d)} as decodingAlgorithm,
]

runAndDisplay(KCproblems[2].targetSegments, audfile, algorithms)