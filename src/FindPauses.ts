import type { TimedTextSegment } from "./utils/TimedTextSegment";

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
function clusterWithKmeans(audioData:number[], clusteringIterations:number):clusterResults{
    const powers = audioData.map((dataPoint)=>{return Math.log10(Math.abs(dataPoint)+0.000000000001)});

    let quietCentroid = Math.min(...randomSample(powers, 10));
    let speechCentroid = Math.max(...randomSample(powers, 10));
    let quietCluster = [];
    let speechCluster = [];

    for(let i = 0; i < clusteringIterations; i++){
        quietCluster = [];
        speechCluster = [];

        for(const point of powers){
            if(Math.abs(quietCentroid - point) > Math.abs(speechCentroid - point)){
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

function printHistogramToProveBimodalness(amplitudes:number[], numBins:number){
    const powers = amplitudes.map((amp)=>{return Math.log10(amp+0.000000000001)})
    
    let min :number = 1;
    let max :number = 0.0000000000000000000001;

    const bins:number[] = new Array(numBins).fill(0);

    for(const amp of powers){
        if(amp > max) max = amp;
        if(amp < min) min = amp;
    }

    console.log(`min power: ${min}\nmax power:${max}`)

    for(const amp of powers){
        const binIndex = Math.floor(numBins * (amp-min)/(max-min))
        if(binIndex < numBins && binIndex >=0){
            bins[binIndex]+=1;
        }
    }

    const maxBinSize = Math.max(...bins);
    let histogram:string = ""
    for(const binSize of bins){
        for(let i = 0; i < binSize; i += 250){
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

    const clusters = clusterWithKmeans(audioData, kMeansIterations);

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

        // console.log(`quiet cluster: mu-${clusters.quietCluster.centroid} sigma-${qClust.variance} pi-${qClust.weight}`);
        // console.log(`speech cluster: mu-${sClust.centroid} sigma-${sClust.variance} pi-${sClust.weight}`);

        qClust.updateParams();
        sClust.updateParams();
    }
       
    return clusters;
}

function getThreshold(audioData: number[]){
    const clusters = clusterWithKmeans(audioData, 10);
    const powerThresh = clusters.quietCluster.members.reduce((maxSoFar, thisValue)=>{
            return Math.max(maxSoFar, thisValue.value)
    }, -Infinity)
    return 10**powerThresh;
}

export function getIsSpeech(audioData:number[]):boolean[]{
    const thresh = getThreshold(audioData);

    const isSpeech:boolean[] = [];

    for(const sample of audioData){
        isSpeech.push(Math.abs(sample) > thresh);
    }

    return isSpeech;
}

export function pauseIntervals(audioData:number[], duration:number):TimedTextSegment[]{
    const thresh = getThreshold(audioData);

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
            if(thisPauseSeg.end - thisPauseSeg.start > MIN_PAUSE_DURATION){
                pauseSegs.push(thisPauseSeg);
            }
            thisPauseSeg = {start:0,end:0,text:""};
        }
    }

    return joinPauses(pauseSegs, 0.1);
}

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
    let currentStart = 0;
    let longestPauseWithCurrentStart = {start:0, end:0, text:""};
    //we only want to return the longest pause with each start time
    for(const pause of pauses){
        if(pause.start == currentStart && pause.end > longestPauseWithCurrentStart.end){
            longestPauseWithCurrentStart = pause;
        }
        else if(pause.start != currentStart){
            joinedPauses.push(longestPauseWithCurrentStart);
            currentStart = pause.start;
            longestPauseWithCurrentStart = pause;

            if(pause.end == pauses[pauses.length-1].end){
                joinedPauses.push(pause);
                break;
            }
        }
    }
    return joinedPauses;
}