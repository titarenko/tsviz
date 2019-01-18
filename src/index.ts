import { readFileSync } from 'fs'
import * as ts from 'typescript'
import * as glob from 'glob'
import { promisify } from 'util'
import { spawnSync } from 'child_process';

interface Object {
  discriminator: EntityType
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
  discriminator: EntityType
  name: string
  values: string[]
}

interface UnionType {
  discriminator: EntityType
  name: string
  types: string[]
}

type Entity = Object | Enum | UnionType
enum EntityType {
  Object,
  Enum,
  UnionType,
}

const search = promisify(glob)

run(process.argv.slice(2, -1))
  .then(dot => {
    console.log(dot)
    const { status, stdout, stderr } = spawnSync('dot', ['-Tpng:cairo', '-o', process.argv[process.argv.length - 1]], { input: dot })
    console.log(status, stdout.toString(), stderr.toString())
  })
  .catch(console.error)
  .then(() => process.exit())

async function run (patterns: string[]): Promise<string> {
  const filenames = (await Promise.all(patterns.map(p => search(p))))
    .reduce((result: string[], a: string[]) => result.concat(a), [])
  const entities = filenames
    .map(parse)
    .reduce((result: Entity[], source) => result.concat(transform(source, source)), [])
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

function transformInterfaceDeclaration (source: ts.SourceFile, node: ts.InterfaceDeclaration): Entity | void {
  return {
    discriminator: EntityType.Object,
    name: node.name.getText(source),
    properties: node.members
      .filter(m => m.kind === ts.SyntaxKind.PropertySignature)
      .map(m => m as ts.PropertySignature)
      .map(m => m.type && ({
        name: m.name.getText(source),
        type: m.type.getText(source),
        nullable: m.questionToken != null,
      }))
      .filter(Boolean) as Property[],
    includes: node.heritageClauses
      ? node.heritageClauses.reduce(
          (result: string[], c) => result.concat(c.types.map(t => t.getText(source))), []
        )
      : [],
  }
}

function transformTypeAliasDeclaration (source: ts.SourceFile, node: ts.Node): Entity | void {
  const children = node.getChildren(source)
  const identifier = children.find(c => c.kind === ts.SyntaxKind.Identifier) as ts.Identifier
  const union = children.find(c => c.kind === ts.SyntaxKind.UnionType) as ts.UnionTypeNode
  if (union) {
    const values = union.types
      .filter(c => c.kind === ts.SyntaxKind.LiteralType)
      .map(c => c.getText(source))
    if (values.length !== 0) {
      return { discriminator: EntityType.Enum, name: identifier.getText(source), values }
    }
    const types = union.types.map(c => c.getText(source))
    if (types.length !== 0) {
      return { discriminator: EntityType.UnionType, name: identifier.getText(source), types }
    }
  }
}

function render (entities: Entity[]): string {
  const nodes = entities.map(renderEntity).filter(Boolean).join('\n')
  const edges = entities.map(renderDependencies).filter(Boolean).join('\n')
  return `digraph G {
    overlap=false
    splines=true

    bgcolor=transparent

    node [shape=record, style=filled, fillcolor="#FFDD00:#FBB034", gradientangle=270]
    edge [dir=back, arrowtail=empty]

    ${nodes}

    ${edges}
  }`
}

function renderEntity (e: Entity): string | void {
  switch(e.discriminator) {
    case EntityType.Object: return renderObject(e as Object)
    case EntityType.Enum: return renderEnum(e as Enum)
    case EntityType.UnionType: return renderUnionType(e as UnionType)
  }
}

function renderObject (e: Object): string {
  const properties = e.properties.map(p => {
    const body = `${p.name}: ${p.type}`
    return p.nullable
      ? `- ${body}`
      : `+ ${body}`
  }).join('\\n')
  return `${e.name}[label = "{${e.name}|${properties}}"]`
}

function renderEnum (e: Enum): string {
  return `${e.name}[label = "{${e.name}:\\n${e.values.join('\\n')}}"]`
}

function renderUnionType (e: UnionType): string {
  return `${e.name}[label = "{${e.name}\\n= ${e.types.join('\\n\\| ')}}"]`
}

function renderDependencies (e: Entity): string | void {
  switch (e.discriminator) {
    case EntityType.Object: return renderObjectDependencies(e as Object)
    case EntityType.UnionType: return renderUnionTypeDependencies(e as UnionType)
  }
}

const primitiveTypes = [
  'String',
  'String[]',
  'Number',
  'Number[]',
  'Boolean',
  'Boolean[]',
]

function renderObjectDependencies (e: Object): string {
  const inheritance = e.includes.map(i => `${i}->${e.name}`).join('\n')
  const aggregation = e.properties
    .filter(p => !primitiveTypes.includes(p.type))
    .map(p => p.type)
    .reduce(unique, [])
    .map(t => `${e.name}->${t}[arrowtail=odiamond]`)
    .join('\n')
  return inheritance + aggregation
}

function renderUnionTypeDependencies(e: UnionType): string {
  return e.types
    .filter(t => !primitiveTypes.includes(t))
    .reduce(unique, [])
    .map(t => `${e.name}->${t}[arrowtail=odiamond]`)
    .join('\n')
}

function unique (result: string[], item: string): string[] {
  return result.indexOf(item) === -1
    ? result.concat([item])
    : result
}
