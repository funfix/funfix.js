#!/usr/bin/env ts-node

import { cd, exec, echo, touch } from "shelljs"
import { readFileSync, existsSync } from "fs"
import * as url from "url"
import * as path from "path"

let repoUrl
let pkg = JSON.parse(readFileSync("package.json") as any)
if (typeof pkg.repository === "object") {
  if (!pkg.repository.hasOwnProperty("url")) {
    throw new Error("URL does not exist in repository section")
  }
  repoUrl = pkg.repository.url
} else {
  repoUrl = pkg.repository
}

const parsedUrl: url.Url = url.parse(repoUrl)
const repository = (parsedUrl.host || "") + (parsedUrl.path || "")
const ghToken = process.env.GH_TOKEN

const destDir = `${pkg.name}-docs-${Math.floor(Math.random() * 100000)}`
const sourceDir = path.resolve(".")
const version = exec("git fetch && git tag | grep '^v' | sort | tail -1")
  .toString()
  .replace(/^\s+|\s+$/g, "")

echo("Deploying docs!!!")
if (existsSync(process.env.TMPDIR)) cd(`${process.env.TMPDIR}`)

exec(`rm -rf "${destDir}"`)
exec(`git clone "https://${ghToken}@${repository}" "${destDir}" -b gh-pages`)

exec(`mkdir -p "${destDir}"/api/`)
exec(`rm -rf "${destDir}"/api/${version} && rm -rf "${destDir}"/api/latest`)
exec(`rsync -rcv --delete-excluded "${sourceDir}"/dist/docs/ "${destDir}"/api/${version}`)
exec(`ln -s ./${version} "${destDir}"/api/latest`)

cd(destDir)
exec("git add .")
exec('git config user.name "Alexandru Nedelcu"')
exec('git config user.email "noreply@alexn.org"')
exec(`git commit -m "docs(docs): update gh-pages for ${version}"`)
exec(`git push --force --quiet "https://${ghToken}@${repository}" master:gh-pages`)

cd("..")
exec(`rm -rf ${destDir}`)
echo("Docs deployed!!")
