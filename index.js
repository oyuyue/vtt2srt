const path = require('path');
const fs = require('fs-extra');
const walk = require('klaw');
const commander = require('commander');
const inquirer = require('inquirer');
const signale = require('signale');

const { version } = require('./package.json')

const interactive = new signale.Signale({ interactive: true });

commander
  .version(version)
  .option('-d, --delete', '删除原文件')
  .on('--help', () => {
    console.log();
    console.log('Examples:');
    console.log('  $ vtt2srt ./subtitles');
    console.log('  $ vtt2srt -d a.vtt');
  })
  .parse(process.argv);

async function vtt2srt(target, { keep = true }) {
  const data = fs
    .readFileSync(target, 'utf-8')
    .replace(/^WEBVTT/g, '')
    .replace(/(\d\d:\d\d)\.(\d\d\d)\b/g, '$1,$2')
    .replace(/(\n|\s)(\d\d:\d\d,\d\d\d)(\s|\n)/g, '$100:$2$3')
    .trim()
    .split(/(?:\r\n\r\n|\n\n|\r\r)/g)
    .map((piece, i) => `${i + 1}\n${piece}\n\n`)
    .join('');

  fs.writeFileSync(`${target.slice(0, -4)}.srt`, data);

  if (!keep) fs.removeSync(target);
}

async function run() {
  let target = commander.args[0];
  if (!target) {
    const ans = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'do',
        message: '转换当前目录下的所有 .vtt 为 .srt 文件?',
        default: false
      }
    ]);

    if (!ans.do) return;
    target = './';
  }
  target = path.resolve(process.cwd(), target);

  let stat = null;

  try {
    stat = await fs.stat(target);
  } catch (error) {
    return signale.fatal(error);
  }

  const options = {
    keep: !commander.delete
  };

  if (stat.isFile()) {
    if (!target.endsWith('.vtt')) return signale.error('文件必须是 .vtt 文件');

    try {
      interactive.await(target);
      await vtt2srt(target, options);
      interactive.success('转换完成！');
    } catch (error) {
      interactive.fatal(error);
    }
  } else if (stat.isDirectory()) {
    const files = [];
    walk(target)
      .on('data', ({ path: p }) => p && p.endsWith('.vtt') && files.push(p))
      .on('end', async () => {
        const len = files.length;
        if (len === 0)
          return signale.error(`目录下没有 .vtt 文件 -> ${target}`);

        const errors = [];

        for (let i = 0; i < len; i++) {
          interactive.await('[%d/%d] - %s', i + 1, len, files[i]);
          try {
            await vtt2srt(files[i], options);
          } catch (error) {
            interactive.fatal(error);
            errors.push(files[i]);
          }
        }

        interactive.success('[%d/%d] - 全部转换完成', len, len);

        if (errors.length > 0) {
          signale.debug('以下文件转换出错 >>>>>>>>>>>>>>');
          console.log();
          errors.forEach(e => {
            signale.error(e);
          });
        }
      });
  } else {
    signale.error('非法资源');
  }
}

if (module.parent == null) {
  run().catch(e => signale.fatal(e));
}
