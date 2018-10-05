const fs = require('fs');
const path = require('path');

class Vtt2srt {

  constructor(dir = '.') {
    dir = path.resolve(process.cwd(), dir);

    if (!this.checkPath(dir)) {
      return false;
    }

    if (dir.endsWith('.vtt')) {
      return this.writeFile(`${dir.slice(0, -4)}.srt`, this.parseData(this.readFile(dir)));
    }

    this.run(dir);
  }

  checkPath(path) {
    try {
      fs.accessSync(path);
      return true;
    } catch (error) {
      console.log(error);
      console.log(`\x1b[93;41m 文件夹|文件 不存在或没有权限 ${path} \x1b[39m`);
      return false;
    }
  }

  run(d) {
    let stat;
    fs.readdirSync(d).forEach(item => {

      stat = fs.statSync(path.resolve(d, item));

      if (stat.isFile()) {
        if (item.endsWith('.vtt')) {
          this.writeFile(
            path.resolve(d, `${item.slice(0, -4)}.srt`),
            this.parseData(this.readFile(path.resolve(d, item)))
          );
        }
      } else if (stat.isDirectory()) {
        this.run(path.resolve(d, item));
      }

    })
  }

  parseData(data) {

    data = data
      .replace(/^WEBVTT/g, '')
      .replace(/(\d\d:\d\d)\.(\d\d\d)\b/g, '$1,$2')
      .replace(/(\n|\s)(\d\d:\d\d,\d\d\d)(\s|\n)/g, '$100:$2$3')
      .trim();

    return (
      data
        .split(/\n\n/g)
        .map((piece, i) => `${i+1}\n${piece}\n\n`)
        .join('')
    );
  }

  readFile(path) {
    return fs.readFileSync(path, { encoding: 'utf8' });
  }

  writeFile(path, data) {
    fs.writeFileSync(path, data);
  }

}

if (module.parent == null) {
  new Vtt2srt(...process.argv.slice(2));
}
