#!/usr/bin/env ts-node

import { cd, exec, echo, touch } from "shelljs"
import { readFileSync, existsSync } from "fs"
import * as url from "url"
import * as path from "path"

if (!process.env["CI"]) {
  console.info("Not running on top of Travis, cannot deploy docs")
  process.exit(1)
}

if (process.env["TRAVIS_BRANCH"] !== "master" || process.env["TRAVIS_PULL_REQUEST"]) {
  console.info("Only deploying docs on the master branch and not for pull requests, exiting!")
  process.exit(0)
}

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

exec(`mkdir -p "${destDir}"/archive/`)
exec(`rm -rf "${destDir}"/archive/${version} && rm -rf "${destDir}"/api`)
exec(`rsync -rcv --delete-excluded "${sourceDir}"/dist/docs/ "${destDir}"/archive/${version}`)
exec(`ln -s ./archive/${version} "${destDir}"/api`)

cd(destDir)
exec("git add .")
exec('git config user.name "Alexandru Nedelcu"')
exec('git config user.email "noreply@alexn.org"')
exec(`git commit -m "docs(docs): update gh-pages for ${version}"`)
exec(`git push --force --quiet "https://${ghToken}@${repository}" gh-pages:gh-pages`)

cd("..")
exec(`rm -rf ${destDir}`)
echo("Docs deployed!!")
