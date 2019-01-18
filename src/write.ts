import { Entity, EntityType, Object, Enum, UnionType } from './types'

export default function write(entities: Entity[]): string {
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

function renderEntity(e: Entity): string | void {
  switch (e.discriminator) {
    case EntityType.Object: return renderObject(e as Object)
    case EntityType.Enum: return renderEnum(e as Enum)
    case EntityType.UnionType: return renderUnionType(e as UnionType)
  }
}

function renderObject(e: Object): string {
  const properties = e.properties.map(p => {
    const body = `${p.name}: ${p.type}`
    return p.nullable
      ? `- ${body}`
      : `+ ${body}`
  }).join('\\n')
  return `${e.name}[label = "{${e.name}|${properties}}"]`
}

function renderEnum(e: Enum): string {
  return `${e.name}[label = "{${e.name}:\\n${e.values.join('\\n')}}"]`
}

function renderUnionType(e: UnionType): string {
  return `${e.name}[label = "{${e.name}\\n= ${e.types.join('\\n\\| ')}}"]`
}

function renderDependencies(e: Entity): string | void {
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

function renderObjectDependencies(e: Object): string {
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

function unique(result: string[], item: string): string[] {
  return result.indexOf(item) === -1
    ? result.concat([item])
    : result
}
