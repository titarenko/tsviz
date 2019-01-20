import { Entity, EntityType, Object, Enum, UnionType } from './types'

export default function write(entities: Entity[]): string {
  const writeEntityOfType = type => entities
    .filter(e => e.discriminator === type)
    .map(writeEntity)
    .filter(Boolean)
    .join('\n')
  const edges = entities.map(writeDependencies).filter(Boolean).join('\n')
  return `digraph G {
    overlap=false
    splines=true

    bgcolor=transparent
    fontname=monospace

    subgraph O {
      node [shape=record, style=filled, fillcolor="#FFDD00:#FBB034", gradientangle=270, fontname=monospace]
      ${writeEntityOfType(EntityType.Object)}
    }

    subgraph E {
      node [shape=record, style=filled, fillcolor="#CEF576:#84FB95", gradientangle=270, fontname=monospace]
      ${writeEntityOfType(EntityType.Enum)}
    }

    subgraph U {
      node [shape=record, style=filled, fillcolor="#DE4DAA:#F6D327", gradientangle=270, fontname=monospace]
      ${writeEntityOfType(EntityType.UnionType)}
    }

    edge [dir=back, arrowtail=empty]
    ${edges}
  }`
}

function writeEntity(e: Entity): string | void {
  switch (e.discriminator) {
    case EntityType.Object: return writeObject(e as Object)
    case EntityType.Enum: return writeEnum(e as Enum)
    case EntityType.UnionType: return writeUnionType(e as UnionType)
  }
}

function writeObject(e: Object): string {
  const properties = e.properties.map(p => {
    const body = `${p.name}: ${p.type}`
    return p.nullable
      ? `- ${body}`
      : `+ ${body}`
  }).join('\\l')
  return `${e.name}[label = "{${e.name}|${properties}\\l}"]`
}

function writeEnum(e: Enum): string {
  return `${e.name}[label = "{${e.name}:\\l${e.values.join('\\l')}}"]`
}

function writeUnionType(e: UnionType): string {
  return `${e.name}[label = "{${e.name}\\l= ${e.types.join('\\l\\| ')}}"]`
}

function writeDependencies(e: Entity): string | void {
  switch (e.discriminator) {
    case EntityType.Object: return writeObjectDependencies(e as Object)
    case EntityType.UnionType: return writeUnionTypeDependencies(e as UnionType)
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

function writeObjectDependencies(e: Object): string {
  const inheritance = e.includes.map(i => `${i}->${e.name}`).join('\n')
  const aggregation = e.properties
    .filter(p => !primitiveTypes.includes(p.type))
    .map(p => p.type)
    .reduce(unique, [])
    .map(t => `${e.name}->${t}[arrowtail=odiamond]`)
    .join('\n')
  return inheritance + aggregation
}

function writeUnionTypeDependencies(e: UnionType): string {
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
