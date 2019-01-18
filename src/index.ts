import { Entity } from './types'

import search from './search'
import parse from './parse'
import transform from './transform'
import write from './write'
import render from './render'

const patterns = process.argv.slice(2, -1)
const output = process.argv[process.argv.length - 1]

run(patterns, output)
  .then(({ dot, result: { exitCode, log, errors} }) => {
    console.log(dot)
    if (exitCode) {
      console.log(exitCode)
    }
    if (log) {
      console.log(log)
    }
    if (errors) {
      console.error(errors)
    }
  })
  .catch(console.error)
  .then(() => process.exit())

async function run (patterns: string[], output: string) {
  const filenames = await search(patterns)
  const sources = await Promise.all(filenames.map(parse))
  const entities = sources.reduce((result: Entity[], source) => result.concat(transform(source, source)), [])
  const dot = write(entities)
  return { dot, result: render(dot, output) }
}
