import * as ts from 'typescript'

import { Entity, EntityType, Property } from './types'

const transformers = {
  [ts.SyntaxKind.InterfaceDeclaration]: transformInterfaceDeclaration,
  [ts.SyntaxKind.TypeAliasDeclaration]: transformTypeAliasDeclaration,
}

export default function transform(source: ts.SourceFile, node: ts.Node): Entity[] {
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

function transformInterfaceDeclaration(source: ts.SourceFile, node: ts.InterfaceDeclaration): Entity | void {
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
      ? node.heritageClauses.reduce((result: string[], c) => result.concat(c.types.map(t => t.getText(source))), [])
      : [],
  }
}

function transformTypeAliasDeclaration(source: ts.SourceFile, node: ts.Node): Entity | void {
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
  } else {
    const type = node as ts.TypeAliasDeclaration
    return {
      discriminator: EntityType.Alias,
      name: identifier.getText(source),
      type: type.type.getText(source),
    }
  }
}
