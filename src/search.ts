import * as glob from 'glob'
import { promisify } from 'util'

const globAsync = promisify(glob)

export default async function search(patterns: string[]) {
  return (await Promise.all(patterns.map(p => globAsync(p))))
    .reduce((result: string[], a: string[]) => result.concat(a), [])
}
