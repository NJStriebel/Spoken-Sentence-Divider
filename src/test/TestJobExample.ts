import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
import { textLength } from "../decoders/DecodeWithTextLength";
import type {decodingAlgorithm} from "../utils/ProcessExample.ts";
import {runAndDisplay} from "../utils/ProcessExample.ts";
import type { TimedTextSegment } from "../utils/TimedTextSegment";
import { pauseIntervals } from "../FindPauses.ts";
import { pauseAwareTextLength } from "../decoders/PauseAwareTextLength.ts";
import { pausesAndPauseAwareLength } from "../decoders/DecodeWithPausesAndPauseAwareLength.ts";

const target = [
    {start:0, end:11.75, text: "Oh that you would hide me in Sheol, that you would conceal me until your wrath be past, that you would appoint me a set time, and remember me!"},
    {start:11.75, end:14.65, text: "If a man dies, shall he live again?"},
    {start:14.65, end:19, text: "All the days of my service I would wait, till my renewal should come."},
    {start:19, end:23.8, text: "You would call, and I would answer you; you would long for the work of your hands."},
    {start:23.8, end:33.40575, text: "For then you would number my steps; you would not keep watch over my sin; my transgression would be sealed up in a bag, and you would cover over my iniquity."},
]

const file = "../../data/Job14.m4a";

const algorithms = [
    {name:"text-length", decode:textLength},
    {name:"pause-aware-text-length", decode:pauseAwareTextLength},
    {name:"highlight-pauses", findPauses:pauseIntervals} as decodingAlgorithm,    
    {name:"pauses-and-pause-aware-text-length", decode:pausesAndPauseAwareLength, highlightPauses:false} as decodingAlgorithm,
    {name:"quietest-nearby", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d), highlightPauses:false} as decodingAlgorithm
]

runAndDisplay(target, file, algorithms);

