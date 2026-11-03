/**
 * miniprogram-ci 上传脚本
 *
 * 使用前准备：
 * 1. 小程序后台（mp.weixin.qq.com）拿到真实 AppID，替换 project.config.json 的 "appid"
 * 2. 「开发设置」下载代码上传密钥，保存为 ci/private.<你的AppID>.key（不要提交到 git）
 * 3. 把本机出口 IP 加入「代码上传密钥」的 IP 白名单
 *
 * 运行：
 *   node scripts/upload.js --ver 1.0.0 --desc "首个体验版"
 */
const fs = require('fs')
const path = require('path')

// 屏蔽系统代理：避免 miniprogram-ci 把请求转发到本地代理导致 access_token 校验失败（41001）
;['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy'].forEach(k => delete process.env[k])
process.env.NO_PROXY = '*'
process.env.no_proxy = '*'

const ci = require('miniprogram-ci')

const projectRoot = path.resolve(__dirname, '..')
const miniRoot = path.join(projectRoot, 'miniprogram') // 小程序源码根（与 project.config.json 的 miniprogramRoot 对应）
const args = process.argv.slice(2)

function argOf(name) {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : null
}

function getAppid() {
  const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'project.config.json'), 'utf8'))
  if (!cfg.appid || cfg.appid === 'touristappid') {
    console.error('[x] 请先把 project.config.json 里的 appid 换成真实 AppID')
    process.exit(1)
  }
  return cfg.appid
}

function findKey(appid) {
  // 约定：密钥放在 ci/ 目录，文件名形如 private.wx1234567890abcdef.key
  const dir = path.join(projectRoot, 'ci')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir)
  const hit = fs.readdirSync(dir).find(f => f.startsWith('private.' + appid + '.key'))
  if (!hit) {
    console.error('[x] 未找到密钥文件 ci/private.' + appid + '.key')
    console.error('    请从 mp.weixin.qq.com 「开发设置」下载后放到该路径')
    process.exit(1)
  }
  return path.join(dir, hit)
}

async function main() {
  const appid = getAppid()
  const keyPath = findKey(appid)
  const version = argOf('ver') || '1.0.0'
  const desc = argOf('desc') || 'CI 上传 ' + new Date().toLocaleString('zh-CN')

  const project = new ci.Project({
    appid,
    type: 'miniProgram',
    projectPath: miniRoot,
    privateKeyPath: keyPath,
    ignores: ['node_modules/**/*', 'ci/**/*', '.workbuddy/**/*', 'scripts/**/*'],
  })

  const result = await ci.upload({
    project,
    version,
    desc,
    setting: { es6: true, minify: true, autoPrefixWXSS: true },
    robot: Number(argOf('robot') || 1),
    onProgressUpdate: t => {
      if (t._status === 'done') console.log('[done]', t._msg)
    },
  })

  console.log('[ok] 上传成功，版本 ' + version)
  console.log('     接下来到 mp.weixin.qq.com 「版本管理 → 开发版本」设为体验版 / 提交审核')
}

main().catch(err => {
  console.error('[x] 上传失败:', err.message || err)
  process.exit(1)
})
