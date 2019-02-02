import { Entity, EntityType, Object, Enum, UnionType, Alias } from './types'

const escapeHtml = require('escape-html')

export default function write(entities: Entity[]): string {
  const writeEntityOfType = type => entities
    .filter(e => e.discriminator === type)
    .map(writeEntity)
    .filter(Boolean)
    .join('\n')
  const edges = entities.map(writeDependencies).filter(Boolean).join('\n')
  return `digraph G {
    overlap=false
    esep=1
    splines=true
    rankdir=LR

    bgcolor=transparent

    subgraph O {
      node [shape=none, margin=0, style=filled, fillcolor="#FFDD00:#FBB034", gradientangle=270, fontname=georgia]
      ${writeEntityOfType(EntityType.Object)}
    }

    subgraph E {
      node [shape=none, margin=0, style=filled, fillcolor="#CEF576:#84FB95", gradientangle=270, fontname=georgia]
      ${writeEntityOfType(EntityType.Enum)}
    }

    subgraph U {
      node [shape=none, margin=0, style=filled, fillcolor="#DE4DAA:#F6D327", gradientangle=270, fontname=georgia]
      ${writeEntityOfType(EntityType.UnionType)}
    }

    subgraph A {
      node [shape=none, margin=0, style=filled, fillcolor="#788CB6:#FDB813", gradientangle=270, fontname=georgia]
      ${writeEntityOfType(EntityType.Alias)}
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
    case EntityType.Alias: return writeAlias(e as Alias)
  }
}

function writeObject(e: Object): string {
  const properties = e.properties.map(p => {
    const body = `${p.name}: ${escape(p.type)}`
    return p.nullable
      ? `- ${body}`
      : `+ ${body}`
  }).join('\\l')
  return `${e.name}[label =<
    <table border="1" cellborder="0" cellspacing="0">
      <tr>
        <td colspan="2"><b>${e.name}</b></td>
      </tr>
      ${e.properties.map(p => `<tr>
        <td align="left"><font color="${p.nullable ? '#555555' : '#000000'}">${p.name}</font></td>
        <td align="left" port="${p.name}"><font color="${p.nullable ? '#555555' : '#000000'}">${escape(p.type)}</font></td>
      </tr>`).join('\n')}
    </table>
  >]`
}

function writeEnum(e: Enum): string {
  return `${e.name}[label =<
    <table border="1" cellborder="0" cellspacing="0">
      <tr><td><i>&laquo;enum&raquo;</i></td></tr>
      <tr><td><b>${e.name}</b></td></tr>
      ${e.values.map(v => `<tr><td align="left">${v}</td></tr>`).join('\n')}
    </table>
  >]`
}

function writeUnionType(e: UnionType): string {
  return `${e.name}[label =<
    <table border="1" cellborder="0" cellspacing="0">
      <tr><td><i>&laquo;union&raquo;</i></td></tr>
      <tr><td><b>${e.name}</b></td></tr>
      ${e.types.map(t => `<tr><td align="left" port="${escape(singular(t))}">${t}</td></tr>`).join('\n')}
    </table>
  >]`
}

function writeAlias(e: Alias): string {
  return `${e.name}[label =<
    <table border="1" cellborder="0" cellspacing="0">
      <tr><td><i>&laquo;alias&raquo;</i></td></tr>
      <tr><td><b>${e.name}</b></td></tr>
      <tr><td align="left">${escape(e.type)}</td></tr>
    </table>
  >]`
}

function writeDependencies(e: Entity): string | void {
  switch (e.discriminator) {
    case EntityType.Object: return writeObjectDependencies(e as Object)
    case EntityType.UnionType: return writeUnionTypeDependencies(e as UnionType)
  }
}

const primitiveTypes = [
  'string',
  'string[]',
  'number',
  'number[]',
  'boolean',
  'boolean[]',
  'object',
  'object[]',
  'Function',
  'Function[]',
]

function writeObjectDependencies(e: Object): string {
  const inheritance = e.includes
    .map(i => `${i}->${e.name}`)
    .join('\n')
  const aggregation = e.properties
    .filter(p => !primitiveTypes.includes(p.type))
    .map(p => `${e.name}:${p.name}->${quote(escape(singular(p.type)))}[style=${p.nullable ? 'dashed' : 'solid'} color="${p.nullable ? '#555555' : '#000000'}" arrowtail=odiamond]`)
    .join('\n')
  return `${inheritance}\n${aggregation}`
}

function writeUnionTypeDependencies(e: UnionType): string {
  return e.types
    .filter(t => !primitiveTypes.includes(t))
    .map(t => `${e.name}:${escape(singular(t))}->${escape(singular(t))}[arrowtail=icurve]`)
    .join('\n')
}

function singular (type) {
  return type.replace(/\[\]/g, '')
}

function quote (string) {
  return `"${string}"`
}

function escape (original) {
  return escapeHtml(original)
}
