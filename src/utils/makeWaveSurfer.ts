import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import type { TimedTextSegment } from "./TimedTextSegment";

export async function makeWaveSurfer(containerID:string, soundfile:string, segments: TimedTextSegment[], highlightPauses:boolean){
    const cont = document.getElementById(containerID)!;

    const rp = RegionsPlugin.create();

    const ws: WaveSurfer = new WaveSurfer({
        container: cont,
        cursorWidth:1,
        waveColor: "#0000ff",
        progressColor: "#0000ff",
        plugins:[rp]
    });
    const waiter = ws.load(soundfile);

    ws.on("ready", ()=>{
        if(highlightPauses) highLightRegions(rp, segments);
        else addBreaks(rp, segments, 0.05);
    });

    cont.addEventListener("click", ()=>ws.playPause());

    await waiter;

    return ws;
}

function addBreaks(rp: RegionsPlugin, segments: TimedTextSegment[], barWidth:number){
    for(let i = 0; i < segments.length-1; i++){
        rp.addRegion({
            start: segments[i].end - barWidth/2,
            end:   segments[i].end + barWidth/2,
            drag:false,
            resize:false,
            color: "#ff0000"
        });
    }
}

function highLightRegions(rp: RegionsPlugin, segments:TimedTextSegment[]){
    for(let i = 0; i < segments.length; i++){
        rp.addRegion({
            start: segments[i].start,
            end:   segments[i].end,
            drag:false,
            resize:false,
            color: "#fff700"
        });
    }
}