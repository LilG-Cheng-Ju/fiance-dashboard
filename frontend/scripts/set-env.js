const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = require(packageJsonPath);
const version = packageJson.version;

const targetPath = path.resolve(__dirname, '../src/environments/environment.ts');

fs.readFile(targetPath, 'utf8', (err, data) => {
  if (err) {
    return console.error(err);
  }

  const result = data.replace(
    /appVersion: '.*'/,
    `appVersion: '${version}'`
  );

  fs.writeFile(targetPath, result, 'utf8', (err) => {
    if (err) return console.error(err);
    console.log(`✅ Version updated to ${version} in environment.ts`);
  });
});
