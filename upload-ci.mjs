// miniprogram-ci 上传脚本：推送 main → 自动上传开发版到微信后台。
// 读 process.env.WX_CI_UPLOAD_KEY（GitHub Actions 注入），从 project.config.json 读 appid。
// 上传成功只产生微信后台的「开发版」，不自动提审/发布，人工在后台操作。

import ci from "miniprogram-ci";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = new URL(".", import.meta.url).pathname;
const appid = JSON.parse(readFileSync(join(projectRoot, "project.config.json"), "utf8")).appid;
// 版本号从 package.json 读 (SemVer: MAJOR.MINOR.PATCH)，提交前手动 bump
const version = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")).version;
const key = process.env.WX_CI_UPLOAD_KEY;

if (!key) {
  console.error("缺少 WX_CI_UPLOAD_KEY（在 GitHub Secrets 里配置）");
  process.exit(1);
}

const project = new ci.Project({
  appid,
  type: "miniProgram",
  projectPath: "miniprogram",
  privateKey: key,
  ignores: ["node_modules/**/*", ".github/**/*", "ci/**/*"],
});

await ci.upload({
  project,
  version,
  desc: `CI auto-upload ${new Date().toISOString()}`,
  robot: 1,
  onProgressUpdate: console.log,
});

console.log(`开发版已上传（appid=${appid}, version=${version}），请在微信后台选为体验版或提审`);
