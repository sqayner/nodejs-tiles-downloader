const yargs = require('yargs');
const request = require('request');
const async = require('async')
const fs = require('fs');
const ProgressBar = require('progress')

let bar;

const argv = yargs.argv;

var maxZoom = argv.maxZoom === undefined || argv.maxZoom === "" || argv.maxZoom !== parseInt(argv.maxZoom, 10) ? 4 : argv.maxZoom;
var minZoom = argv.minZoom === undefined || argv.minZoom === "" || argv.minZoom !== parseInt(argv.minZoom, 10) ? 0 : argv.minZoom;

var tileName = argv.tileName === undefined || argv.tileName === "" ? null : argv.tileName;
var tileType = argv.tileType === undefined || argv.tileType === "" ? null : argv.tileType;

var tilesUrl = argv.tilesUrl;

var tiles = [];

if (tilesUrl === undefined || tilesUrl === "") {
    console.log("tilesUrl required")
    process.exit()
}

if (tileName === null) {
    console.log("tileName required")
    process.exit()
}

if (tileType === null || (tileType !== "png" && tileType !== "jpg")) {
    console.log("tileType required")
    process.exit()
}

var dir = './downloads/' + tileName + "/";

if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads');
}

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

class Downloader {
    constructor() {
        this.q = async.queue(this.singleFile, 1);

        this.q.drain(function () {
            console.log('all items have been processed');
        });

        this.q.error(function (err, task) {
            console.error('task experienced an error', task);
        });
    }

    downloadFiles(links) {
        bar = new ProgressBar(links.length + ' tiles downloading [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 100,
            total: links.length
        });
        for (let link of links) {
            this.q.push(link);
        }
    }

    singleFile(link, cb) {
        let file = request(link);
        file.on('response', (res) => {
            file.on('data', (chunk) => {

            })
            file.on('end', () => {
                bar.tick(1);
                cb();
            })
        })
        var splitLink = link.split('/')
        if (!fs.existsSync(dir + splitLink[splitLink.length - 3])) {
            fs.mkdirSync(dir + splitLink[splitLink.length - 3]);
        }
        if (!fs.existsSync(dir + splitLink[splitLink.length - 3] + "/" + splitLink[splitLink.length - 2])) {
            fs.mkdirSync(dir + splitLink[splitLink.length - 3] + "/" + splitLink[splitLink.length - 2]);
        }
        file.pipe(fs.createWriteStream(dir + splitLink[splitLink.length - 3] + "/" + splitLink[splitLink.length - 2] + "/" + splitLink[splitLink.length - 1]))
    }
}

const downloader = new Downloader();

for (let index = minZoom; index < maxZoom; index++) {
    if (index > 0) {
        for (let x = 0; x < Math.sqrt(getTileCountFromZoom(index)); x++) {
            for (let y = 0; y < Math.sqrt(getTileCountFromZoom(index)); y++) {
                tiles.push(tilesUrl + index + '/' + x + '/' + y + '.' + tileType)
            }
        }
    } else {
        tiles.push(tilesUrl + index + '/0/0.' + tileType)
    }
}
downloader.downloadFiles(tiles)

function getTileCountFromZoom(zoom) {
    let tile = 1;

    for (let z = 0; z < zoom; z++) {
        tile = tile * 4
    }
    return tile;
}