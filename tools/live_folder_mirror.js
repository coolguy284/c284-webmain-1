let FROM_PATH = process.argv[2];
let TO_PATH = process.argv[3];

console.log(`From ${FROM_PATH}`);
console.log(`To ${TO_PATH}`);

let fs = require('fs');
let path = require('path');

async function recursiveReaddir(basePath, excludedDirs, includeDirs) {
  if (!Array.isArray(excludedDirs)) excludedDirs = [];
  
  let currentExcludeDirs = excludedDirs.filter(x => !x.includes('/'));
  
  let contents = (await fs.promises.readdir(basePath, { withFileTypes: true }))
    .filter(x => !currentExcludeDirs.includes(x.name));
  
  var folders = [], files = [];
  
  contents.forEach(x => x.isDirectory() ? folders.push(x) : files.push(x));
  
  if (includeDirs) {
    return [
      '.',
      ...(await Promise.all(folders.map(async x =>
        (await recursiveReaddir(
          basePath + '/' + x.name,
          excludedDirs
            .filter(x => x.startsWith(x))
            .map(x => x.split('/').slice(1).join('/')),
          includeDirs
        ))
        .map(y => (x.name + '/' + y).replace(/\/\.$/, ''))
      )))
      .reduce((a, c) => (a.push(...c), a), []),
      ...files.map(x => x.name),
    ];
  } else {
    return [
      ...(await Promise.all(folders.map(async x =>
        (await recursiveReaddir(
          basePath + '/' + x.name,
          excludedDirs
            .filter(x => x.startsWith(x))
            .map(x => x.split('/').slice(1).join('/')),
          includeDirs
        ))
        .map(y => (x.name + '/' + y))
      )))
      .reduce((a, c) => (a.push(...c), a), []),
      ...files.map(x => x.name),
    ];
  }
}

(async () => {
  console.log('Reading dirs');
  
  let fromFiles = new Set(await recursiveReaddir(FROM_PATH, ['node_modules'], true));
  let toFiles = new Set(await recursiveReaddir(TO_PATH, [], true));
  
  console.log('Removing extra files');
  
  // reverse to delete files first then folders
  let toFilesToDelete = Array.from(toFiles).filter(x => !fromFiles.has(x)).reverse();
  
  for (let x of toFilesToDelete) {
    let toPath = path.join(TO_PATH, x);
    
    console.log(`Removing ${toPath}`);
    await fs.promises.rm(toPath, { recursive: true });
  }
  
  console.log('Copying changed files');
  
  for (let x of fromFiles) {
    let fromPath = path.join(FROM_PATH, x);
    let toPath = path.join(TO_PATH, x);
    
    if (!toFiles.has(x)) {
      // file/folder doesnt exist in copy
      
      let fromStats = await fs.promises.stat(fromPath);
      
      if (fromStats.isFile()) {
        console.log(`Adding file ${toPath}`);
        await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
      } else if (fromStats.isDirectory()) {
        console.log(`Adding directory ${toPath}`);
        await fs.promises.mkdir(toPath);
      }
    } else {
      // file/folder exists
      
      let fromStats = await fs.promises.stat(fromPath);
      let toStats = await fs.promises.stat(toPath);
      
      if (fromStats.isFile()) {
        if (!toStats.isFile()) {
          console.log(`Removing then creating non-file ${toPath}`);
          await fs.promises.rm(toPath, { recursive: true });
          await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
        } else if (fromStats.mtime.getTime() > toStats.mtime.getTime()) {
          console.log(`Replacing ${toPath}`);
          await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
        }
      } else if (fromStats.isDirectory()) {
        if (!fromStats.isDirectory()) {
          console.log(`Removing then creating non-directory ${toPath}`);
          await fs.promises.rm(toPath, { recursive: true });
          await fs.promises.mkdir(toPath);
        }
      }
    }
  }
  
  console.log('Starting watch for changed files');
  
  for await (let { eventType, filename } of fs.promises.watch(FROM_PATH, { recursive: true })) {
    try {
      let fromPath = path.join(FROM_PATH, filename);
      let toPath = path.join(TO_PATH, filename);
      
      switch (eventType) {
        case 'change': {
          let fromStats = await fs.promises.stat(fromPath);
          
          if (fromStats.isDirectory()) {
            // ignored
          } else if (fromStats.isFile()) {
            try {
              let toStats = await fs.promises.stat(toPath);
              
              if (!toStats.isFile()) {
                console.log(`Removing then creating non-file ${toPath}`);
                await fs.promises.rm(toPath, { recursive: true });
                await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
              } else {
                console.log(`Replacing ${toPath}`);
                await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
              }
            } catch {
              console.log(`Adding file ${toPath}`);
              await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
            }
          }
          break;
        }
        
        case 'rename':
          try {
            let fromStats = await fs.promises.stat(fromPath);
            
            if (fromStats.isFile()) {
              try {
                let toStats = await fs.promises.stat(toPath);
                
                if (!toStats.isFile()) {
                  console.log(`Removing then creating non-file ${toPath}`);
                  await fs.promises.rm(toPath, { recursive: true });
                  await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
                } else {
                  console.log(`Replacing ${toPath}`);
                  await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
                }
              } catch {
                // to dir file doesnt exist
                console.log(`Adding file ${toPath}`);
                await fs.promises.writeFile(toPath, await fs.promises.readFile(fromPath));
              }
            } else if (fromStats.isDirectory()) {
              try {
                let toStats = await fs.promises.stat(toPath);
                
                if (!toStats.isDirectory()) {
                  console.log(`Removing then creating non-directory ${toPath}`);
                  await fs.promises.rm(toPath, { recursive: true });
                  await fs.promises.cp(fromPath, toPath, { recursive: true });
                } else {
                  console.log(`Replacing ${toPath}`);
                  await fs.promises.rm(toPath, { recursive: true });
                  await fs.promises.cp(fromPath, toPath, { recursive: true });
                }
              } catch {
                // to dir directory doesnt exist
                console.log(`Adding directory ${toPath}`);
                await fs.promises.mkdir(toPath);
              }
            }
          } catch {
            // object deleted
            
            console.log(`Removing ${toPath}`);
            await fs.promises.rm(toPath, { recursive: true });
          }
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }
})();
