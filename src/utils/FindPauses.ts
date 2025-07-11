import type { decodingAlgorithm } from "./ProcessExample";
import type { TimedTextSegment } from "./TimedTextSegment";

const MIN_PAUSE_DURATION = 0.01; //a pause has to be at least this many seconds in order to be counted

function randomSample(toSample:number[], numSamples:number):number[]{
    const sample = [];
    for(let i = 0; i < numSamples; i++){
        sample.push( toSample[Math.floor(Math.random() * toSample.length)])
    }
    return sample;
}

//use simple k-means clustering (K=2) to find initial values for the GMM algorithm
//cursory tests typically converged in about 10 iterations
function clusterWithKmeansKis2(audioData:number[], clusteringIterations:number):clusterResults{
    const powers = audioData.map((dataPoint)=>{return Math.log10(Math.abs(dataPoint)+0.000000000001)});

    let quietCentroid = Math.min(...randomSample(powers, 10));
    let speechCentroid = Math.max(...randomSample(powers, 10));
    let quietCluster = [];
    let speechCluster = [];

    for(let i = 0; i < clusteringIterations; i++){
        quietCluster = [];
        speechCluster = [];

        for(const point of powers){
            if(Math.abs(quietCentroid - point) < Math.abs(speechCentroid - point)){
                quietCluster.push(point);
            }else{
                speechCluster.push(point);
            }
        }

        quietCentroid = quietCluster.reduce((total, next) => total+next) / quietCluster.length;
        speechCentroid = speechCluster.reduce((total, next) => total+next) / speechCluster.length;
    }    
    
    const quietStdDev = Math.sqrt(quietCluster.map(dp=>(quietCentroid-dp)**2).reduce((sum, thisDeviation)=>sum+thisDeviation)/quietCluster.length)
    const speechStdDev = Math.sqrt(speechCluster.map(dp=>(speechCentroid-dp)**2).reduce((sum, thisDeviation)=>sum+thisDeviation)/speechCluster.length)

    return {
        quietCluster: new GMMcluster(quietCentroid, quietStdDev, quietCluster.length/powers.length, quietCluster.map(val=> {return{value:val, responsibility:0}})),
        speechCluster: new GMMcluster(speechCentroid, speechStdDev, speechCluster.length/powers.length, speechCluster.map(val=> {return{value:val, responsibility:0}}))
    }
}

function clusterWithKmeans(audioData:number[], k:number, clusteringIterations:number):GMMcluster[]{
    const powers = audioData.map((dataPoint)=>{return Math.log10(Math.abs(dataPoint)+0.000000000001)});

    const sample = randomSample(powers, powers.length/100);
    const sampleMin = Math.min(...sample);
    const sampleMax = Math.max(...sample);

    //evenly distribute our starting centroid guesses throughout a random sample
    let centroids : number[] = [];
    for(let i = 0; i < k; i++){
        centroids.push(sampleMin + ((i+1)/k)*(sampleMax-sampleMin))
    }

    let clusters : number[][] = [];
    for(let i = 0; i < k; i++){
        clusters.push([]);
    }

    for(let i = 0; i < clusteringIterations; i++){
        clusters = clusters.map(()=>[]);
        centroids.sort();

        for(const point of powers){
            let assigned=false;
            for(let i = 0; i < k-1; i++){
                //only works because centroids is sorted
                if(Math.abs(point - centroids[i]) < Math.abs(point - centroids[i+1])){
                    clusters[i].push(point);
                    assigned = true;
                }
            }
            if (!assigned) clusters[clusters.length-1].push(point);
        }

        centroids = centroids.map((currCentroid, i)=>{
            return clusters[i].reduce((total, next) => total+next, 0) / clusters[i].length
        })
    } 
    
    const stdDevs = clusters.map((cluster, i)=>{
        return Math.sqrt(cluster.map(dp=>(centroids[i]-dp)**2).reduce((sum, thisDeviation)=>sum+thisDeviation, 0)/cluster.length);
    })
    
    
    return clusters.map((cluster, i)=>{
        return new GMMcluster(centroids[i], stdDevs[i], 1/k, cluster.map(val=>{return{value:val, responsibility:1}}))
    })
}

function clusterWithKmeansAdjustToPeak(audioData:number[], k:number, clusteringIterations:number, maxCentroidMovePercent=1):GMMcluster[]{
    const numBins = 100;
    const powerClusters = clusterWithKmeans(audioData, k, clusteringIterations);
    const powers = audioData.map((amp)=>{return Math.log10(amp+0.000000000001)})

    let min :number = 1;
    let max :number = -100;

    for(const amp of powers){
        if(amp > max) max = amp;
        if(amp < min) min = amp;
    }

    const bins = binData(powers, min, max, numBins);

    for(const cluster of powerClusters){
        const centroidBinI = Math.floor(numBins * (cluster.centroid-min)/(max-min))
        let nearbyMaxI = -1;
        let nearbyMaxCount = 0;

        for(let i = Math.max(centroidBinI - maxCentroidMovePercent, 0); i < Math.min(centroidBinI+maxCentroidMovePercent, bins.length-1) ; i++){
            if(bins[i] > nearbyMaxCount){
                nearbyMaxCount = bins[i];
                nearbyMaxI = i;
            }
        }

        cluster.centroid = min + nearbyMaxI * (max-min) / numBins;
    }

    return powerClusters;
}

//Practically every audio file has a ton of samples that are practically zero. If we ignore those, our K-means might do a better job of finding the binormal distribution
function clusterWithKmeansIgnoreZeros(audioData:number[], clusteringIterations:number, minClusterAffectingPower:number):clusterResults{
    const powers = audioData.map((dataPoint)=>{return Math.log10(Math.abs(dataPoint)+0.000000000001)});

    let quietCentroid = Math.min(...randomSample(powers, 10));
    let speechCentroid = Math.max(...randomSample(powers, 10));
    let quietCluster = [];
    let speechCluster = [];

    for(let i = 0; i < clusteringIterations; i++){
        quietCluster = [];
        speechCluster = [];

        for(const point of powers){
            if(Math.abs(point) < minClusterAffectingPower){
                continue;
            }else if(Math.abs(quietCentroid - point) < Math.abs(speechCentroid - point)){
                quietCluster.push(point);
            }else{
                speechCluster.push(point);
            }
        }

        quietCentroid = quietCluster.reduce((total, next) => total+next) / quietCluster.length;
        speechCentroid = speechCluster.reduce((total, next) => total+next) / speechCluster.length;
    }    
    
    const quietStdDev = Math.sqrt(quietCluster.map(dp=>(quietCentroid-dp)**2).reduce((sum, thisDeviation)=>sum+thisDeviation)/quietCluster.length)
    const speechStdDev = Math.sqrt(speechCluster.map(dp=>(speechCentroid-dp)**2).reduce((sum, thisDeviation)=>sum+thisDeviation)/speechCluster.length)

    return {
        quietCluster: new GMMcluster(quietCentroid, quietStdDev, quietCluster.length/powers.length, quietCluster.map(val=> {return{value:val, responsibility:0}})),
        speechCluster: new GMMcluster(speechCentroid, speechStdDev, speechCluster.length/powers.length, speechCluster.map(val=> {return{value:val, responsibility:0}}))
    }
}

type GMMdataPoint = {
    value: number,
    responsibility: number
}

function responsibilityNumerator(value:number, parent:GMMcluster):number{
    const baseTerm = (1/Math.sqrt(2*Math.PI * parent.variance**2));
    const exponentTerm = (-1*(value-parent.centroid)**2 / (2*parent.variance**2));
    
    //console.log(`multiplying ${baseTerm} by e to the ${exponentTerm}`);

    return parent.weight * baseTerm * Math.E**exponentTerm; 
}

class GMMcluster{
    public centroid:number;
    public variance:number;
    public weight:number;
    public members:GMMdataPoint[];

    public constructor(mu:number, sigma:number, pi:number, members:GMMdataPoint[]=[]){
        this.centroid = mu;
        this.variance = sigma;
        this.weight = pi;
        this.members = members;
    }

    public updateParams(){
        let responsibilitySum = 0;
        let responsibilityCrossValueSum = 0;
        for(const point of this.members){
            responsibilitySum += point.responsibility;
            responsibilityCrossValueSum += point.responsibility * point.value;
        }
        this.weight = responsibilitySum / this.members.length;
        this.centroid = responsibilityCrossValueSum / responsibilitySum;

        let varianceSum = 0;
        for(const point of this.members){
            varianceSum += point.responsibility * (point.value - this.centroid)**2
        }
        this.variance = varianceSum / responsibilitySum;
    }
}

type clusterResults = {
    quietCluster:GMMcluster,
    speechCluster:GMMcluster
}

function binData(values:number[], min:number, max:number, numBins:number):number[]{
    const bins:number[] = new Array(numBins).fill(0);

    for(const amp of values){
        const binIndex = Math.floor(numBins * (amp-min)/(max-min))
        if(binIndex < numBins && binIndex >=0){
            bins[binIndex]+=1;
        }
    }

    return bins;
}

function printHistogramToProveBimodalness(amplitudes:number[], numBins:number){
    const powers = amplitudes.map((amp)=>{return Math.log10(amp+0.000000000001)})
    
    let min :number = 1;
    let max :number = 0.0000000000000000000001;

    for(const amp of powers){
        if(amp > max) max = amp;
        if(amp < min) min = amp;
    }

    console.log(`min power: ${min}\nmax power: ${max}`);

    const bins = binData(powers, min, max, numBins);    

    const maxBinSize = Math.max(...bins);
    let histogram:string = ""
    for(const binSize of bins){
        for(let i = 0; i < binSize; i += maxBinSize/65){
            histogram += "x";
        }
        histogram += "\n";
    }

    console.log(histogram);
}

function printHistogramWithMarkers(amplitudes:number[], numBins:number, markerAmps:number[]){
    const powers = amplitudes.map((amp)=>{return Math.log10(amp+0.000000000001)});
    const markerPowers = markerAmps.map(amp=>Math.log10(amp+0.000000000001));
    
    let min :number = Infinity;
    let max :number = -Infinity;

    for(const amp of powers){
        if(amp > max) max = amp;
        if(amp < min) min = amp;
    }

    console.log(`min power: ${min}\nmax power: ${max}`);

    const bins = binData(powers, min, max, numBins);

    const markerIs = markerPowers.map(mp=>Math.floor(numBins * (mp-min)/(max-min)));

    const maxBinSize = Math.max(...bins);
    let histogram:string = ""
    for(let i=0; i < bins.length; i++){
        if(markerIs.indexOf(i) != -1){
            histogram += "**********************************************************************\n"
        }

        for(let j = 0; j < bins[i]; j += maxBinSize/65){
            histogram += "x";
        }
        histogram += "\n";
    }

    console.log(histogram);
}

//strong tendency to converge to a local minimum where one distribution covers all data
function clusterWithGMM(audioData:number[], kMeansIterations:number, GMMiterations:number):clusterResults{
    //printHistogramToProveBimodalness(audioData.map(Math.abs), 60);

    //convert from amplitude to something proportional to power
    const powers : number[] = audioData.map((dataPoint)=>{return Math.log10(Math.abs(dataPoint)+0.000000000001)});

    const clusters = clusterWithKmeansKis2(audioData, kMeansIterations);

    const qClust = clusters.quietCluster;
    const sClust = clusters.speechCluster;

    for(let i = 0; i < GMMiterations; i++){
        qClust.members = [];
        sClust.members = [];

        for(const point of powers){
            const quietRespNum = responsibilityNumerator(point, qClust);
            const speechRespNum = responsibilityNumerator(point, sClust);
            
            const quietResponsibility = quietRespNum / (quietRespNum + speechRespNum);
            const speechResponsibility = speechRespNum / (quietRespNum + speechRespNum);

            qClust.members.push({value:point, responsibility:quietResponsibility});
            sClust.members.push({value:point, responsibility:speechResponsibility});
        }
        qClust.updateParams();
        sClust.updateParams();
    }
       
    return clusters;
}

let speechThreshold:number|undefined = undefined;
let lastInput:number[]|undefined = undefined;
//we default to k=3 because there's usually a big spike for power=0, then our two peaks for background noise and speech
function getThreshold(audioData:number[], iterations:number, k:number, fractionOfSpeech:number):number{
    if(lastInput != audioData){
        speechThreshold = undefined;
        lastInput = audioData;
    }
    
    if(speechThreshold === undefined){
        if(k<2) k=2;
        // console.log("calculating threshold")
        const powerClusters = clusterWithKmeansAdjustToPeak(audioData, k, iterations);
        powerClusters.sort((a,b)=>b.centroid-a.centroid);

        //cluster 1 is speech, cluster 0 is background noise
        //set power threshold somewhere between the cluster representing speech and the cluster representing background noise
        //fractionOfSpeech ranges from 1 to infinity. 
        //  if it's 1, powerThreshold is the speech centroid. 
        //  If it's 2, powerThreshold is halfway between speech centroid and background centroid.
        //  If it's 3, powerThreshold is 1/3 of the way from background centroid up to speech centroid 
        //  As it approaches infinity, powerThreshold approaches the background noise centroid
        const powerThreshold = powerClusters[1].centroid + (powerClusters[0].centroid - powerClusters[1].centroid) * fractionOfSpeech;

        speechThreshold = 10**powerThreshold;
        // console.log(`Threshold found at ${speechThreshold}\ncentroids are ${10**powerClusters[0].centroid} and ${10**powerClusters[1].centroid}`)
        //printHistogramWithMarkers(audioData, 100, [speechThreshold, 10**powerClusters[0].centroid, 10**powerClusters[1].centroid]);
    }
    else{
        // console.log(`returning pre-computed Threshold: ${speechThreshold}`)
    }
    
    return speechThreshold;
}

// export function pauseIntervals(audioData:number[], duration:number):TimedTextSegment[]{
//     const thresh = getThreshold(audioData, 10);

//     const sampleLength = duration / audioData.length; //seconds per sample

//     const pauseSegs : TimedTextSegment[] = []
//     let in_a_pause = false;
//     let thisPauseSeg = {start:0,end:0,text:""};
//     for(let i = 0; i < audioData.length; i++){
//         if(Math.abs(audioData[i]) <= thresh && !in_a_pause){
//             in_a_pause = true;
//             thisPauseSeg.start = i * sampleLength;
//         }
//         else if(in_a_pause && (Math.abs(audioData[i]) > thresh || i==audioData.length-1)){
//             in_a_pause = false;
//             thisPauseSeg.end = i * sampleLength;
//             if(thisPauseSeg.end - thisPauseSeg.start > MIN_PAUSE_DURATION){
//                 pauseSegs.push(thisPauseSeg);
//             }
//             thisPauseSeg = {start:0,end:0,text:""};
//         }
//     }

//     return joinPauses(pauseSegs, 0.1);
// }

function joinPauses(pauses:TimedTextSegment[], maxGapToJoin:number):TimedTextSegment[]{
    for(let i = 0; i < pauses.length-1; i++){
        if(pauses[i+1].start - pauses[i].end <= maxGapToJoin){
            const joinedPause = {
                start:pauses[i].start,
                end:pauses[i+1].end,
                text:''
            }
            pauses[i+1] = joinedPause;
        }
    }

    const joinedPauses = [];
    let longestPauseWithCurrentStart = pauses[0];
    //we only want to return the longest pause with each start time
    for(const pause of pauses){
        if(pause.start === longestPauseWithCurrentStart.start && pause.end > longestPauseWithCurrentStart.end){
            longestPauseWithCurrentStart = pause;

            if(pause.end === pauses[pauses.length-1].end){
                joinedPauses.push(pause);
                break;
            }
        }
        else if(pause.start != longestPauseWithCurrentStart.start){
            joinedPauses.push(longestPauseWithCurrentStart);
            longestPauseWithCurrentStart = pause;
        }
    }

    return joinedPauses;
}

export function makePauseFinder(minPauseDuration:number, minGapPreDrop:number, minGapPostDrop:number, kMeansIterations:number, k:number, fractionOfSpeech:number):decodingAlgorithm{
    return {
        name:`pauseFinder: mpd-${minPauseDuration} mgPREd-${minGapPreDrop} mgPOSTd-${minGapPostDrop} kmi-${kMeansIterations} k-${k}`,
        findPauses: (audioData:number[], duration:number) => {
            const thresh = getThreshold(audioData, kMeansIterations, k, fractionOfSpeech);
            
            const sampleLength = duration / audioData.length; //seconds per sample

            const pauseSegs : TimedTextSegment[] = []
            let in_a_pause = false;
            let thisPauseSeg = {start:0,end:0,text:""};
            for(let i = 0; i < audioData.length; i++){
                if(Math.abs(audioData[i]) <= thresh && !in_a_pause){
                    in_a_pause = true;
                    thisPauseSeg.start = i * sampleLength;
                }
                else if(in_a_pause && (Math.abs(audioData[i]) > thresh || i==audioData.length-1)){
                    in_a_pause = false;
                    thisPauseSeg.end = i * sampleLength;
                    pauseSegs.push(thisPauseSeg);
                    thisPauseSeg = {start:0,end:0,text:""};
                }
            }

            const joinedPauses = joinPauses(pauseSegs, minGapPreDrop);
            const postDropPauses = joinedPauses.filter((thisPause)=>thisPause.end-thisPause.start>minPauseDuration);
            return joinPauses(postDropPauses, minGapPostDrop);
        }
    }
}

export function makeSpeechFinder(kMeansIterations:number, k:number, fractionOfSpeech:number):(ad:number[])=>boolean[]{
    return (audioData:number[])=>{
        const thresh = getThreshold(audioData, kMeansIterations, k, fractionOfSpeech);
        return audioData.map(point => point >= thresh);
    }
}