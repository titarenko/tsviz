import { readFile } from 'fs'
import * as ts from 'typescript'
import { promisify } from 'util'

const read = promisify(readFile)

export default async function parse(filename: string): Promise<ts.SourceFile> {
  const content = (await read(filename)).toString()
  return ts.createSourceFile(filename, content, ts.ScriptTarget.ES2015)
}
