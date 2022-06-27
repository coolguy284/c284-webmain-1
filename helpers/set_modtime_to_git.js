// node set_modtime_to_git.js <repoPath> [folderInRepoPath]

var cp = require('child_process');
var fs = require('fs');

var recursiveReaddir = require('../srv_web_main/common/recursive_readdir');

function getGitModDate(repoPath, filePath) {
  return new Promise((resolve, reject) => {
    var proc = cp.spawn(
      'git',
      ['log', '-1', '--pretty="format:%cI"', filePath],
      { cwd: repoPath, stdio: 'pipe', timeout: 60000 }
    );
    var outputBufs = [], errorBufs = [];
    proc.stdout.on('data', c => outputBufs.push(c));
    proc.stderr.on('data', c => errorBufs.push(c));
    proc.on('close', code => {
      switch (code) {
        case 0:
          var output = Buffer.concat(outputBufs).toString();
          if (output == '')
            resolve(null);
          else
            resolve(new Date(JSON.parse(output).slice(7)));
          break;
        
        case 128:
          resolve(null);
          break;
        
        default:
          reject(new Error(Buffer.concat(errorBufs).toString().trim()));
          break;
      }
    });
  });
}

async function setModTimes(repoPath, folderInRepoPath) {
  var folderPath = repoPath + '/' + folderInRepoPath;
  for (var filePath of recursiveReaddir(folderPath, ['.git', '.vs'])) {
    var repoFilePath = folderInRepoPath + '/' + filePath
    var modDate = await getGitModDate(repoPath, repoFilePath);
    if (modDate) {
      var trueFilePath = repoPath + '/' + repoFilePath;
      console.log(`updating: ${modDate.toISOString()} ${trueFilePath}`);
      fs.promises.utimes(trueFilePath, modDate, modDate);
    }
  }
}

setModTimes('.', 'srv_web_main/websites/public');
