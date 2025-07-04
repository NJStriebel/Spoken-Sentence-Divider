// import * as fs from "fs"
// import type { TimedTextSegment } from "./TimedTextSegment";
// import { runAndDisplay } from "./ProcessExample";
// import { textLength } from "../decoders/DecodeWithTextLength";
// import { quietestNearby } from "../decoders/DecodeWithQuietestNearby";
// import type { decodingAlgorithm } from "./ProcessExample";
// import WaveSurfer from "wavesurfer.js";
// import { saveAudioBufferAsWav } from "./SaveToWav";


// const audiofile = "../../data/AdamDriver_2015P.sph"
// const textfile = "../../data/AdamDriver_2015P.stm"

// const fileContent = fs.readFileSync(textfile, "utf-8");
// const lines = fileContent.split("\n");

// const segs : TimedTextSegment[] = []

// for(const line of lines){
//     const pieces = line.split(" ");
//     segs.push({
//         start:parseFloat(pieces[3]),
//         end:parseFloat(pieces[4]),
//         text:pieces[6]
//     });
// }

// const targetSegsToTest = segs.slice(0,5);
// const startTime = targetSegsToTest[0].start;
// const endTime = targetSegsToTest[ targetSegsToTest.length-1 ].end;

// //amend the audio file to only contain the time range we're concerned with
// const ws = new WaveSurfer({container:"N/A"});
// await ws.load(audiofile);
// const audioBuf = ws.getDecodedData()!;
// const sr = audioBuf.sampleRate;
// const newData = audioBuf.getChannelData(0)!.slice(sr*startTime, sr*endTime);
// const newBuf = new AudioBuffer({
//     length:newData.length,
//     numberOfChannels:1,
//     sampleRate:sr
// });
// newBuf.copyToChannel(newData, 0);

// const newAudioFile : string = `${audiofile}-sliced.wav`
// saveAudioBufferAsWav(audioBuf, newAudioFile);

// const algorithms = [
//     {name:"text-length", decode:textLength} as decodingAlgorithm,
//     {name:"quietest-nearby", decode:(is:TimedTextSegment[], ad:number[], d:number)=>quietestNearby(textLength(is, ad, d), ad, d)} as decodingAlgorithm
// ]

// runAndDisplay(targetSegsToTest, newAudioFile, algorithms)