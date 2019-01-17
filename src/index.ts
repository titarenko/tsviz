import { readFileSync } from 'fs'
import * as ts from 'typescript'
import * as glob from 'glob'
import { promisify } from 'util'

interface Object {
  name: string
  properties: Property[]
  includes: string[]
}

interface Property {
  name: string
  type: string
  nullable: boolean
}

interface Enum {
  name: string
  values: string[]
}

interface UnionType {
  name: string
  types: string[]
}

type Entity = Object | Enum | UnionType

const search = promisify(glob)

run(process.argv[2])
  .then(console.log)
  .catch(console.error)
  .then(() => process.exit())

async function run (pattern: string): Promise<string> {
  const filenames = await search(pattern)
  const entities = filenames
    .map(parse)
    .reduce((result, source) => result.concat(transform(source, source)), [])
  return render(entities)
}

function parse (filename: string): ts.SourceFile {
  const content = readFileSync(filename).toString()
  return ts.createSourceFile(filename, content, ts.ScriptTarget.ES2015)
}

const transformers = {
  [ts.SyntaxKind.InterfaceDeclaration]: transformInterfaceDeclaration,
  [ts.SyntaxKind.TypeAliasDeclaration]: transformTypeAliasDeclaration,
}

function transform (source: ts.SourceFile, node: ts.Node): Entity[] {
  const entities: Entity[] = []

  const transformer = transformers[node.kind]
  if (transformer) {
    const entity = transformer(source, node)
    if (entity) {
      entities.push(entity)
    }
  }

  return entities.concat(...node.getChildren(source).map(c => transform(source, c)))
}

function transformInterfaceDeclaration (source: ts.SourceFile, node: ts.InterfaceDeclaration) {
  return {
    name: node.name.getText(source),
    properties: node.members
      .filter(m => m.kind === ts.SyntaxKind.PropertySignature)
      .map(m => <ts.PropertySignature>m)
      .map(m => ({
        name: m.name.getText(source),
        type: m.type.getText(source),
        nullable: m.questionToken != null,
      })),
    includes: node.heritageClauses && node.heritageClauses
      .reduce(
        (result, c) => result.concat(c.types.map(t => t.getText(source))),
        []
      )
  }
}

function transformTypeAliasDeclaration (source: ts.SourceFile, node: ts.Node) {
  const children = node.getChildren(source)
  const identifier = <ts.Identifier>children.find(c => c.kind === ts.SyntaxKind.Identifier)
  const union = <ts.UnionTypeNode>children.find(c => c.kind === ts.SyntaxKind.UnionType)
  if (union) {
    const values = union.types
      .filter(c => c.kind === ts.SyntaxKind.LiteralType)
      .map(c => c.getText(source))
    if (values.length !== 0) {
      return { name: identifier.getText(source), values }
    }
    const types = union.types
      .filter(c => c.kind === ts.SyntaxKind.TypeReference)
      .map(c => c.getText(source))
    if (types.length !== 0) {
      return { name: identifier.getText(source), types }
    }
  }
}

function render (entities: Entity[]): string {
  return JSON.stringify(entities, null, 2)
}
