// from https://github.com/coolguy284/zextra/blob/54d880b4fa89ccf191eced17711534a2aa30f3ea/package_update.mjs

import {
  access,
  readdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';
import { get } from 'node:https';
import {
  basename,
  dirname,
} from 'node:path';

const FILES_TO_CHECK = ['package.json', 'package-basic.json'];
const DEPS_TO_CHECK = ['dependencies', 'optionalDependencies', 'devDependencies'];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (err) {
    if (err.code == 'ENOENT') {
      return false;
    } else {
      throw err;
    }
  }
}

async function getTempPath(path) {
  const folderPath = dirname(path);
  const fileName = basename(path);
  
  const folderFiles = new Set(await readdir(folderPath));
  
  let tempPath;
  
  let index = 0;
  
  while (folderFiles.has(tempPath = `${folderPath}/${fileName}.tmp.${index}`)) {
    index++;
  }
  
  return tempPath;
}

async function processPackages(projectFolders) {
  // Get all files
  
  const files = new Map();
  
  for (const folder of projectFolders) {
    for (const file of FILES_TO_CHECK) {
      const path = folder + '/' + file;
      
      console.log(`Processing file ${path}`);
      
      if (await exists(path)) {
        const fileText = (await readFile(path)).toString();
        const fileJson = JSON.parse(fileText);
        const fileLines = fileText.split(/\r?\n/);
        
        let fileBlankLines = [];
          
        for (let i = 0; i < fileLines.length; i++) {
          if (/^ +$/.test(fileLines[i])) fileBlankLines.push(i);
        }
        
        files.set(
          path,
          {
            text: fileText,
            json: fileJson,
            line: fileLines,
            blankLines: fileBlankLines,
          },
        );
      }
    }
  }
  
  // Get packages
  
  const packages = new Set();
  
  for (const { json } of files.values()) {
    for (const dependencyPath of DEPS_TO_CHECK) {
      if (dependencyPath in json) {
        for (const [ packageName, currentVersion ] of Object.entries(json[dependencyPath])) {
          // Ignore git repo or other complicated dependencies:
          if (!currentVersion.includes('/')) {
            packages.add(packageName);
          }
        }
      }
    }
  }
  
  // Get package info
  
  const packageVersion = new Map();
  
  for (const packageName of packages) {
    console.log(`Getting package ${packageName}`);
    
    try {
      const npmResponse =
        await new Promise((r, j) => {
          const req = get(`https://registry.npmjs.org/${packageName}`, {
            headers: {
              'accept': 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
            },
          }, res => {
            let errored = false;
            
            if (res.statusCode != 200) {
              j(new Error('package not found'));
              res.socket.destroySoon();
              errored = true;
            }
            
            let chunks = [];
            
            res.on('data', c => {
              if (!errored) {
                chunks.push(c);
              }
            });
            
            res.on('end', () => {
              if (!errored) {
                r(
                  Buffer
                    .concat(chunks)
                    .toString()
                );
              }
            });
            
            res.on('error', err => {
              if (!errored) {
                j(err);
                errored = true;
              }
            });
          });
          
          req.on('error', err => {
            j(err);
          });
          
          req.end();
        });
      
      const version =
        JSON.parse(npmResponse)
          ['dist-tags']
          .latest;
      
      packageVersion.set(packageName, version);
    } catch (err) {
      console.error(`Error getting package: ${packageName}`);
      console.error(err);
    }
  }
  
  // Replace version numbers
  
  for (const file of files.values()) {
    const { json, blankLines } = file;
    
    for (const dependencyPath of DEPS_TO_CHECK) {
      if (dependencyPath in json) {
        for (const [ packageName, oldVersion ] of Object.entries(json[dependencyPath])) {
          // First if is for ignore git repo or other complicated dependencies:
          if (!oldVersion.includes('/')) {
            if (packageVersion.has(packageName)) {
              json[dependencyPath][packageName] = `^${packageVersion.get(packageName)}`;
            }
          }
        }
      }
    }
    
    const newLines =
      JSON.stringify(json, null, 2)
      .split('\n');
    
    for (const line of blankLines) {
      newLines.splice(line, 0, '    ');
    }
    
    file.newText =
      newLines.join('\n') +
      '\n';
  }
  
  // Replace files
  
  for (const [ path, { newText } ] of files) {
    console.log(`Updating file ${path}`);
    
    const tempPath = await getTempPath(path);
    
    await writeFile(tempPath, newText);
    await rename(tempPath, path);
  }
}

processPackages(['proc_main', 'srv_web_main', '.']);
